import unittest
from unittest.mock import patch
import revenuecat_release as rc

class RevenueCatStoreTests(unittest.TestCase):
    def state(self, app):
        return {'apps':[app], 'products':[], 'entitlementProducts':[], 'packages':{}, 'entitlement':None, 'offering':None}

    def test_official_play_store_type_is_detected(self):
        status=rc.required_status(self.state({'id':'android-app','type':'play_store'}))
        self.assertEqual(status['googleApp'],'android-app')

    def test_products_require_configured_store_credentials(self):
        state=self.state({'id':'android-app','type':'play_store','play_store':{'play_service_account_credentials_configured':False}})
        with patch.object(rc,'expect') as api:
            with self.assertRaises(SystemExit): rc.ensure_google_products(state)
            api.assert_not_called()

    def test_configured_play_store_app_gets_matching_products(self):
        state=self.state({'id':'android-app','type':'play_store','play_store':{'play_service_account_credentials_configured':True}})
        with patch.object(rc,'expect',return_value={'id':'product'}) as api:
            rc.ensure_google_products(state)
            self.assertEqual(api.call_count,2)
            self.assertEqual({call.args[2]['app_id'] for call in api.call_args_list},{'android-app'})
            self.assertEqual({call.args[2]['store_identifier'] for call in api.call_args_list},{'strengthsave_pro_monthly:monthly','strengthsave_pro_yearly:yearly'})

if __name__=='__main__': unittest.main()
