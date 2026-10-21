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
if __name__=='__main__':unittest.main()
