import json
from unittest.mock import patch
from django.test import TestCase
from workspace.tests import test_api as fixtures
bilingual = fixtures.bilingual
from workspace.models import Report
from workspace.views import now_ms, profile_fingerprint

class PreferencesAndAnalysisTests(TestCase):
    setUp = fixtures.WorkspaceTests.setUp
    post = fixtures.WorkspaceTests.post
    def test_saved_preferences_are_authoritative_for_public_card(self):
        self.user.card={'user':{'login':'developer'}, 'repos':[]}
        self.user.save()
        self.assertEqual(self.post('/api/me/preferences',{'theme':'solar-forge','language':'en'}).status_code,200)
        self.assertEqual(self.client.get('/api/me').json()['user']['preferences'],{'theme':'solar-forge','language':'en'})
        self.client.cookies.clear()
        response=self.client.get('/api/cards/developer?theme=sky-bloom&lang=fa')
        self.assertEqual(response.json()['preferences'],{'theme':'solar-forge','language':'en'})
        self.assertEqual(self.post('/api/me/preferences',{'language':'fa'}).status_code,401)

    def test_invalid_preferences_do_not_overwrite_saved_values(self):
        self.assertEqual(self.post('/api/me/preferences',{'theme':'invalid','language':'en'}).status_code,400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.language,'fa')

    @patch.dict('os.environ', {'GEMINI_API_KEY':'test'})
    def test_ttl_major_change_and_translation_share_one_generation(self):
        source={'user':{'login':'developer','followers':1},'repos':[], 'profileReadme':'Python engineer'}
        output=bilingual({'title':'معرفی','summary':'متن','resume':['الف','ب','ج'],'skills':[],'strengths':[],'suggestions':[]})
        with patch('workspace.views.profile_data',return_value=source), patch('workspace.views.generate_ai_text',return_value=(json.dumps(output),'test')) as model:
            initial=self.post('/api/me/ai').json()
            self.assertEqual(set(initial['locales']),{'fa','en'})
            self.post('/api/me/preferences',{'language':'en'})
            self.post('/api/me/ai')
            source['user']['followers']=2
            self.post('/api/me/ai')
            self.assertEqual(model.call_count,1)
            Report.objects.filter(key='ai:1').update(saved=now_ms()-86400001)
            Report.objects.filter(key='limit:ai:1').delete()
            self.post('/api/me/ai')
            self.assertEqual(model.call_count,2)
            source['profileReadme']='Python and Rust systems engineer'
            Report.objects.filter(key='limit:ai:1').delete()
            self.post('/api/me/ai')
            self.assertEqual(model.call_count,3)

    @patch.dict('os.environ', {'GEMINI_API_KEY':'test'})
    def test_incomplete_bilingual_response_preserves_previous_analysis(self):
        source={'user':{'login':'developer'},'repos':[]}
        old={'schemaVersion':3,'fingerprint':profile_fingerprint(source),'locales':{'fa':{},'en':{}}}
        Report.objects.create(key='ai:1',value=old,saved=now_ms()-86400001)
        with patch('workspace.views.profile_data',return_value=source), patch('workspace.views.generate_ai_text',return_value=('{}','test')):
            self.assertEqual(self.post('/api/me/ai').status_code,502)
        self.assertEqual(Report.objects.get(key='ai:1').value,old)

    @patch.dict('os.environ', {'GEMINI_API_KEY':'test'})
    def test_flat_fa_en_payload_is_accepted(self):
        source={'user':{'login':'developer'},'repos':[],'profileReadme':''}
        locale={
            'telegramText':'A builder of useful tools.', 'featuredProjects':[],
            'role':'مهندس نرم‌افزار','sloganLead':'ساخت محصول','slogan':'آرام','traits':['دقیق'],
            'title':'معرفی','summary':'متن','resume':['الف','ب','ج'],'skills':[],'strengths':['a'],'suggestions':['b'],
        }
        flat={'fa':locale,'en':{**locale,'role':'Software engineer','sloganLead':'Build calmly','slogan':'Steady','title':'About'},'imagePrompt':'soft 3d figure'}
        with patch('workspace.views.profile_data',return_value=source), patch('workspace.views.generate_ai_text',return_value=(json.dumps(flat),'test')):
            response=self.post('/api/me/ai')
        self.assertEqual(response.status_code,200)
        body=response.json()
        self.assertEqual(set(body['locales']),{'fa','en'})
        self.assertEqual(body['imagePrompt'],'soft 3d figure')
