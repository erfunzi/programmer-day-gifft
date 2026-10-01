from unittest.mock import patch
from xml.etree.ElementTree import fromstring
from django.test import override_settings
from workspace.models import Report
from workspace.public_data import public_card_payload, public_analysis
from workspace.telegram import profile_for_caption
from workspace.tests.test_api import WorkspaceTests
from workspace.views import now_ms
from django.test import TestCase


class PublicBoundaryTests(TestCase):
    setUp = WorkspaceTests.setUp
    post = WorkspaceTests.post

    def source(self):
        return {'token':'secret', 'user':{'login':'developer', 'name':'Builder', 'id':1,
                'avatar_url':'https://example.com/a.png','public_repos':1,'followers':2,
                'email':'private@example.com','owned_private_repos':2,'total_private_repos':3,
                'private_gists':1,'collaborators':5,'disk_usage':9,'two_factor_authentication':True,
                'user_view_type':'private','site_admin':True,'plan':{'name':'private'}},
                'repos':[{'name':'public-tool','private':False,'topics':['web',{'token':'secret'}],
                          'description':{'token':'secret'},'permissions':{'admin':True},'owner':{'token':'secret'}},
                         {'name':'secret-project','private':True}, {'name':'internal-project','visibility':'internal'}]}

    def test_legacy_public_card_is_allowlisted_at_every_level(self):
        self.user.card = self.source()
        self.user.save()
        Report.objects.create(key='ai:1',saved=now_ms(),value={'schemaVersion':3,'prompt':'secret',
            'locales':{'fa':{'title':'Builder','summary':{'token':'secret'},'traits':['web',{'token':'secret'}],
                            'skills':[{'name':'Python','evidence':'public tool','source':'project','token':'secret'}], 'token':'secret'}}})
        self.client.cookies.clear()
        response = self.client.get('/api/cards/developer')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['user']['login'], 'developer')
        self.assertEqual([r['name'] for r in body['repos']], ['public-tool'])
        self.assertEqual(body['repos'][0]['topics'], ['web'])
        self.assertNotIn('description',body['repos'][0])
        self.assertNotIn('summary',body['analysis']['locales']['fa'])
        for field in ('token','email','private_gists','owned_private_repos','total_private_repos','collaborators','disk_usage','two_factor_authentication','user_view_type','site_admin','plan','permissions','owner','prompt'):
            self.assertNotIn('"'+field+'"', response.content.decode())
        self.assertEqual(response['Cache-Control'],'no-store')
        self.assertEqual(body['preferences']['language'],'fa')

    def test_profile_and_share_save_only_public_contract(self):
        source = self.source()
        with patch('workspace.views.profile_data',return_value=source):
            for action in (lambda:self.client.get('/api/me/profile'),lambda:self.post('/api/me/share')):
                self.assertEqual(action().status_code,200)
                self.user.refresh_from_db()
                self.assertEqual(self.user.card,public_card_payload(source))

    def test_telegram_cleans_both_legacy_card_and_profile_cache(self):
        self.user.card=self.source()
        self.assertEqual(profile_for_caption(self.user),public_card_payload(self.source()))
        Report.objects.create(key='profile:1',saved=now_ms(),value=self.source())
        self.assertEqual(profile_for_caption(self.user),public_card_payload(self.source()))

    def test_malformed_and_absent_analysis_is_safe(self):
        self.assertIsNone(public_analysis(None))
        self.assertEqual(public_card_payload({'user':[], 'repos':[None,1,{}]}),{'user':{},'repos':[]})
        self.user.card={'user':{'login':'developer'},'repos':[]}
        self.user.save()
        self.assertIsNone(self.client.get('/api/cards/developer').json()['analysis'])

    @override_settings(APP_ORIGIN='https://cards.example.org')
    def test_discovery_files_have_real_types_and_do_not_list_users(self):
        robots=self.client.get('/robots.txt')
        self.assertTrue(robots['Content-Type'].startswith('text/plain'))
        self.assertIn(b'Disallow: /api/',robots.content)
        self.assertIn(b'https://cards.example.org/sitemap.xml',robots.content)
        sitemap=self.client.get('/sitemap.xml')
        self.assertEqual(sitemap['Content-Type'],'application/xml')
        root=fromstring(sitemap.content)
        self.assertEqual([node.text for node in root.iter() if node.tag.endswith('loc')],['https://cards.example.org/'])
        self.assertEqual(self.client.head('/robots.txt').status_code,200)
        self.assertEqual(self.post('/sitemap.xml').status_code,405)
