import base64
import gzip
import importlib.util
import json
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('sport_server',pathlib.Path(__file__).parents[1]/'server/server.py')
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
def pack(x): return base64.b64encode(gzip.compress(json.dumps(x).encode())).decode()
class SportSyncTest(unittest.TestCase):
 def setUp(self):
  self.room={'game':'bb','status':'started','seed':'same-world','players':{'a':{'id':'a','name':'Alex'},'b':{'id':'b','name':'Ben'}}}
 def submit(self,pid,phase='pre',**extra):
  return s.sport_sync(self.room,self.room['players'][pid],{'year':2026,'phase':phase,'sub':pack({'progress':{'club':0 if pid=='a' else 1}}),'canon':pack({'world':1}),**extra})[0]
 def test_barrier_and_immutable_retries(self):
  a=self.submit('a');self.assertFalse(a['done']);self.assertEqual(a['waiting'][0]['id'],'b')
  with self.assertRaises(ValueError):self.submit('a','regular')
  b=self.submit('b');self.assertTrue(b['done'])
  retry=self.submit('a',sub=pack({'hijack':True}),canon=pack({'changed':1}))
  self.assertEqual(b,retry)
  self.submit('a','regular');self.assertTrue(self.submit('b','regular')['done'])
 def test_departure_and_late_participant(self):
  self.submit('a');del self.room['players']['b'];self.assertTrue(self.submit('a')['done'])
  self.room['players']['c']={'id':'c','name':'C'}
  with self.assertRaises(ValueError):self.submit('c')
 def test_duel_waits_for_both_and_reconnect_is_idempotent(self):
  self.submit('a');self.submit('b')
  body={'year':2026,'key':'rs:NBA:1:0:1','match':{'a':0,'b':1,'strength':[85,85],'periods':4}}
  def duel(pid,**more):return s.sport_duel(self.room,self.room['players'][pid],{**body,**more})[0]
  self.assertEqual(duel('a')['score'],[0,0])
  first=duel('a',turn=0,choice=0);self.assertEqual(first['turn'],0)
  second=duel('b',turn=0,choice=2);self.assertEqual(second['turn'],1)
  self.assertEqual(duel('a',turn=0,choice=2),second)
  for turn in range(1,11):
   if second['done']:break
   duel('a',turn=turn,choice=0);second=duel('b',turn=turn,choice=2)
  self.assertTrue(second['done']);self.assertNotEqual(*second['score'])
  self.assertEqual(duel('a'),duel('b'))

class TennisRoomTest(unittest.TestCase):
 def setUp(self):
  self.room={'game':'tn','status':'started','seed':'tour','players':{'a':{'id':'a','name':'Alex'},'b':{'id':'b','name':'Ben'}}}
 def sync(self,pid,tick,phase,sub='{}'):return s.sport_sync(self.room,self.room['players'][pid],{'year':tick,'phase':phase,'sub':sub})[0]
 def test_window_barrier_and_results(self):
  self.assertFalse(self.sync('a',0,'pick')['done'])
  with self.assertRaises(ValueError):self.sync('a',0,'done')
  self.assertTrue(self.sync('b',0,'pick')['done'])
  me=self.room['players']
  self.assertIsNone(s.tn_result(self.room,me['b'],{'tick':0,'key':'k'})[0]['result'])
  s.tn_result(self.room,me['a'],{'tick':0,'key':'k','result':{'winner':1,'score':'6-4 6-4'}})
  s.tn_result(self.room,me['b'],{'tick':0,'key':'k','result':{'winner':0,'score':'x'}})
  self.assertEqual(s.tn_result(self.room,me['b'],{'tick':0,'key':'k'})[0]['result']['winner'],1)
  self.sync('a',0,'done');self.assertTrue(self.sync('b',0,'done')['done'])
  for t in range(2,14,2):self.sync('a',t,'pick')
  self.assertLessEqual(len(self.room['sportSync']),4)
 def test_set_duel(self):
  self.sync('a',4,'pick');self.sync('b',4,'pick');me=self.room['players']
  body={'tick':4,'key':'4-0-itf-0-h:a-h:b','match':{'pids':['a','b'],'strength':[70,72],'need':2}}
  d=lambda pid,**k:s.tn_duel(self.room,me[pid],{**body,**k})[0]
  st=d('a')
  for turn in range(5):
   if st['done']:break
   d('a',turn=turn,choice=0);st=d('b',turn=turn,choice=2)
  self.assertTrue(st['done']);self.assertEqual(max(st['score']),2);self.assertEqual(d('a'),d('b'))
if __name__=='__main__':unittest.main()
