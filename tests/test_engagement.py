import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('legenda_server', pathlib.Path(__file__).parents[1] / 'server/server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class EngagementTest(unittest.TestCase):
    def setUp(self):
        self.before = server.stats
        server.stats = {}

    def tearDown(self):
        server.stats = self.before

    def test_cohort_accepts_only_the_matching_return_day(self):
        self.assertTrue(server.record_milestone('2026-11-04', 'fb', 'first_visit', '2026-11-04'))
        self.assertFalse(server.record_milestone('2026-11-04', 'fb', 'return_d1', '2026-11-04'))
        self.assertTrue(server.record_milestone('2026-11-05', 'fb', 'return_d1', '2026-11-04'))
        self.assertTrue(server.record_milestone('2026-11-11', 'fb', 'return_d7', '2026-11-04'))
        self.assertEqual(server.stats['2026-11-04']['cohorts']['fb']['milestones'],
                         {'first_visit': 1, 'return_d1': 1, 'return_d7': 1})

    def test_invalid_input_never_creates_a_counter(self):
        for name, cohort in ((['career_start'], '2026-11-04'), ('first_visit', '2026-11-03'),
                             ('return_d7', 'invalid'), ('return_d1', '2026-11-06')):
            self.assertFalse(server.record_milestone('2026-11-04', 'fb', name, cohort))
        self.assertEqual(server.stats, {})


if __name__ == '__main__':
    unittest.main()
