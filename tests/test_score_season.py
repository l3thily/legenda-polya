"""Season reset must preserve archives and reject pre-balance clients."""
import importlib.util
import json
import pathlib
import tempfile
import threading
import unittest
import urllib.request
import urllib.error

spec = importlib.util.spec_from_file_location('game_server', pathlib.Path(__file__).parents[1] / 'server/server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class ScoreSeasonTest(unittest.TestCase):
    def test_reset_and_http_submission(self):
        with tempfile.TemporaryDirectory() as tmp:
            server.SCORES_FILE = str(pathlib.Path(tmp) / 'scores.json')
            old = {'all': [{'id': 'old', 'score': 999}], 'pos-ST': [{'id': 'old', 'score': 999}], 'day-20261007': [{'id': 'historic'}]}
            pathlib.Path(server.SCORES_FILE).write_text(json.dumps(old))
            server.load_scores()
            archive = pathlib.Path(server.SCORES_FILE + '.before-balance-20261016.json')
            self.assertEqual(json.loads(archive.read_text()), old)
            self.assertTrue(all(server.scores['pos-' + p] == [] for p in server.POS_KEYS))
            self.assertEqual(server.scores['all'], [])
            self.assertEqual(server.scores['day-20261007'], old['day-20261007'])
            httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            def post(body):
                request = urllib.request.Request(f'http://127.0.0.1:{httpd.server_port}/api/scores', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
                return urllib.request.urlopen(request)
            try:
                for board in ('all', 'pos-ST'):
                    with self.assertRaises(urllib.error.HTTPError) as err:
                        post({'board': board, 'id': 'old', 'score': 999})
                    self.assertEqual(err.exception.code, 409)
                    with post({'board': board, 'id': 'new', 'score': 100, 'balanceVersion': server.BALANCE_VERSION}) as response:
                        self.assertEqual(json.load(response)['rank'], 1)
                server.load_scores()
                self.assertEqual(server.scores['all'][0]['id'], 'new')
                self.assertEqual(server.scores['pos-ST'][0]['id'], 'new')
                self.assertEqual(json.loads(archive.read_text()), old)
                self.assertFalse(server.goat_backfill())
            finally:
                httpd.shutdown()
                httpd.server_close()
                thread.join()


if __name__ == '__main__':
    unittest.main()
