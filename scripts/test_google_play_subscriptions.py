import unittest
from unittest.mock import Mock
from google_play_subscriptions import build_catalog, money, apply_catalog

class BillingParityTests(unittest.TestCase):
    def reference(self):
        products={}
        for key,period,trial,amount in [('monthly','ONE_MONTH','ONE_WEEK','14.99'),('yearly','ONE_YEAR','TWO_WEEKS','119.99')]:
            products[key]={'attributes':{'productId':'strengthsave_pro_'+key,'subscriptionPeriod':period},'prices':[{'territory':'POL','price':amount,'startDate':None}],'offers':[{'attributes':{'duration':trial,'offerMode':'FREE_TRIAL','numberOfPeriods':1,'endDate':None},'relationships':{'territory':{'data':{'id':'POL'}}}}]}
        return {'territories':{'POL':{'currency':'PLN'}},'products':products}
    def conversion(self):
        return {k:{'regionVersion':{'version':'current'},'convertedRegionPrices':{'PL':{'price':money('PLN','19.00')},'US':{'price':money('USD','4.00')}}} for k in ['monthly','yearly']}
    def test_actual_ios_prices_override_store_conversion(self):
        result=build_catalog(self.reference(),self.conversion())
        self.assertEqual(result[0]['subscription']['basePlans'][0]['regionalConfigs'],[{'regionCode':'PL','price':money('PLN','14.99'),'newSubscriberAvailability':True}])
        self.assertEqual(result[1]['subscription']['basePlans'][0]['regionalConfigs'][0]['price'],money('PLN','119.99'))
    def test_trial_is_once_across_both_plans_and_matches_ios_duration(self):
        result=build_catalog(self.reference(),self.conversion())
        for item,duration in zip(result,['P7D','P14D']):
            self.assertEqual(item['offer']['phases'][0]['duration'],duration)
            self.assertEqual(item['offer']['targeting'],{'acquisitionRule':{'scope':{'anySubscriptionInApp':{}}}})
            self.assertEqual(item['offer']['phases'][0]['regionalConfigs'],[{'regionCode':'PL','free':{}}])
    def test_changed_reference_trial_cannot_silently_publish_old_policy(self):
        ref=self.reference();ref['products']['monthly']['offers'][0]['attributes']['duration']='THREE_DAYS'
        with self.assertRaisesRegex(ValueError,'trial'):build_catalog(ref,self.conversion())
    def test_missing_ios_prices_cannot_enable_unreviewed_countries(self):
        ref=self.reference();ref['products']['monthly']['prices']=[]
        with self.assertRaisesRegex(ValueError,'regions'):build_catalog(ref,self.conversion())
    def test_existing_price_mismatch_never_mutates_or_activates(self):
        catalog=build_catalog(self.reference(),self.conversion())
        session=Mock()
        response=Mock(status_code=200)
        response.json.return_value={'packageName':'wrong-package'}
        session.get.return_value=response
        with self.assertRaisesRegex(RuntimeError,'refusing to overwrite'):
            apply_catalog(session,catalog)
        session.request.assert_not_called()

    def test_profile_failure_never_activates_any_product(self):
        catalog=build_catalog(self.reference(),self.conversion())
        session=Mock()
        session.get.return_value=Mock(status_code=404)
        error=Mock(status_code=400)
        error.json.return_value={'error':{'message':'Register a payments profile'}}
        session.request.return_value=error
        with self.assertRaisesRegex(RuntimeError,'payments profile'):
            apply_catalog(session,catalog)
        self.assertEqual(session.request.call_count,1)
        self.assertNotIn(':activate',session.request.call_args.args[1])

    def test_money_uses_exact_decimal_nanos(self):
        self.assertEqual(money('PLN','119.99'),{'currencyCode':'PLN','units':'119','nanos':990000000})
        with self.assertRaises(ValueError):money('PLN','-1')
if __name__=='__main__':unittest.main()
