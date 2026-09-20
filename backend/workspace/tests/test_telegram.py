from unittest.mock import patch
from django.test import TestCase
from workspace.models import UserProfile, TelegramPublication, TelegramLink, Report
from workspace.telegram import render_caption
import html
import re
from workspace.telegram import (publish, publication_state, enforce_membership_deadlines, PublicationUnavailable, TelegramAPIError, WEEK, GRACE)
from workspace.views import now_ms


class TelegramLifecycleTests(TestCase):
    def test_caption_uses_personal_copy_and_only_real_featured_projects(self):
        profile = {'user':{'login':'builder','name':'Builder <&>'}, 'repos':[
            {'name':'builder','stargazers_count':100}, {'name':'forked','fork':True},
            {'name':'useful-tool','stargazers_count':3}, {'name':'other','stargazers_count':10}]}
        analysis = {'locales':{'fa':{'telegramText':'ابزار <کاربردی> & ساده', 'featuredProjects':['invented','useful-tool','forked']}}}
        caption = render_caption(profile, 'solar-forge', analysis)
        self.assertIn('ابزار &lt;کاربردی&gt; &amp; ساده', caption)
        self.assertIn('Builder &lt;&amp;&gt;', caption)
        self.assertLess(caption.index('useful-tool'), caption.index('other'))
        self.assertNotIn('invented', caption)
        self.assertNotIn('forked', caption)
        analysis['locales']['fa']['telegramText'] = '🚀' * 1000
        caption = render_caption(profile, 'solar-forge', analysis)
        self.assertLessEqual(len(html.unescape(re.sub('<[^>]+>', '', caption)).encode('utf-16-le')) // 2, 1024)

    @patch('workspace.telegram.api_call', return_value={'message_id':456})
    def test_publish_reads_cached_ai_without_generating_a_second_message(self, api):
        Report.objects.create(key='ai:99',value={'locales':{'fa':{'telegramText':'متن اختصاصی سازنده','featuredProjects':[]}}},saved=now_ms())
        self.post()
        self.assertIn('متن اختصاصی سازنده', api.call_args.kwargs['data']['caption'])
        self.assertIn('lang=fa', api.call_args.kwargs['data']['reply_markup'])

    def setUp(self):
        self.user = UserProfile.objects.create(id=99, login='test', joined=now_ms(), card={'user':{'login':'test'},'repos':[]})
        self.config = patch('workspace.telegram.configured', return_value=True)
        self.config.start()
        self.addCleanup(self.config.stop)

    def post(self, **kwargs):
        return publish(self.user, card_image=(b'png', 'image/png'), **kwargs)

    def existing(self, age, **kwargs):
        return TelegramPublication.objects.create(user=self.user, chat_id='channel', message_id=123, created=now_ms()-age, **kwargs)

    @patch('workspace.telegram.api_call', return_value={'message_id':123})
    def test_initial_publish_is_once_even_after_refresh(self, api):
        self.assertTrue(self.post()['created'])
        self.assertFalse(self.post()['created'])
        self.assertFalse(publication_state(self.user)['initialPublish'])
        api.assert_called_once()

    @patch('workspace.telegram.api_call')
    def test_deleted_post_still_has_week_cooldown(self, api):
        self.existing(GRACE+1, deleted=True)
        with self.assertRaises(PublicationUnavailable):
            self.post(refresh=True)
        self.assertFalse(publication_state(self.user)['canPublish'])
        api.assert_not_called()

    @patch('workspace.telegram.api_call', side_effect=TelegramAPIError('Bad Request: message is not modified'))
    def test_existing_post_cannot_be_republished_after_week(self, api):
        self.existing(WEEK+1)
        with self.assertRaises(PublicationUnavailable):
            self.post(refresh=True)
        self.assertFalse(publication_state(self.user)['canPublish'])
        self.assertTrue(all(call.args[0] == 'editMessageReplyMarkup' for call in api.call_args_list))

    @patch('workspace.telegram.api_call')
    def test_missing_post_can_be_manually_republished_after_week(self, api):
        self.existing(WEEK+1)
        api.side_effect = [TelegramAPIError('Bad Request: message to edit not found'), {'message_id':456}]
        self.assertTrue(self.post(refresh=True)['created'])
        row=TelegramPublication.objects.get(user=self.user)
        self.assertEqual(row.message_id,456)
        self.assertFalse(row.deleted)
        self.assertFalse(row.membership_checked)

    @patch('workspace.telegram.api_call', side_effect=TelegramAPIError('Forbidden: bot is not a member'))
    def test_uncertain_existence_never_sends_duplicate(self, api):
        self.existing(WEEK+1)
        self.assertFalse(publication_state(self.user)['canPublish'])
        with self.assertRaises(TelegramAPIError):
            self.post(refresh=True)
        self.assertFalse(TelegramPublication.objects.get(user=self.user).deleted)

    @patch('workspace.telegram.api_call', return_value=True)
    def test_grace_period_and_history_survive_deletion(self, api):
        row=self.existing(GRACE-60000)
        enforce_membership_deadlines()
        api.assert_not_called()
        row.created=now_ms()-GRACE-1
        row.save()
        enforce_membership_deadlines()
        row.refresh_from_db()
        self.assertTrue(row.deleted)
        self.assertFalse(publication_state(self.user)['initialPublish'])
        api.assert_called_once_with('deleteMessage', {'chat_id':'channel','message_id':123})

    @patch('workspace.telegram.member_status')
    @patch('workspace.telegram.api_call')
    def test_member_kept_and_unknown_membership_retried(self, api, member):
        row=self.existing(GRACE+1)
        TelegramLink.objects.create(token='link', user=self.user, telegram_id=456, expires=now_ms())
        member.return_value=None
        enforce_membership_deadlines()
        row.refresh_from_db()
        self.assertFalse(row.membership_checked)
        member.return_value='member'
        enforce_membership_deadlines()
        row.refresh_from_db()
        self.assertTrue(row.membership_checked)
        self.assertFalse(row.deleted)
        api.assert_not_called()

    @patch('workspace.telegram.api_call', side_effect=TelegramAPIError('Forbidden'))
    def test_failed_delete_does_not_forget_live_message(self, api):
        row=self.existing(GRACE+1)
        enforce_membership_deadlines()
        row.refresh_from_db()
        self.assertFalse(row.deleted)
