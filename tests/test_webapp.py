from seleniumbase import BaseCase
from seleniumbase.config import settings

import shlex
import subprocess

uwsgi_command = shlex.split('uwsgi --ini uwsgi.ini')

class TestWebapp(BaseCase):
    def setUp(self):
        super(TestWebapp, self).setUp()
        self.uwsgi = subprocess.Popen(uwsgi_command, cwd='..')

    def tearDown(self):
        self.uwsgi.terminate()
        super(TestWebapp, self).tearDown()

    def open_home(func):
        def wrapper(self, *args, **kwargs):
            self.set_window_size('640', '480')
            self.open("http://localhost:8000")
            self.assert_element("#map path.leaflet-interactive",
                timeout=settings.EXTREME_TIMEOUT)
        return wrapper

    @open_home
    def test_results(self):
        pass

    @open_home
    def test_js_errors(self):
        self.assert_no_js_errors()

    @open_home
    def test_404_errors(self):
        self.assert_no_404_errors()

    @open_home
    def test_tabs(self):
        for button in self.find_elements('#mode input'):
            self.click(button)
            self.assert_no_js_errors()
            self.assert_no_404_errors()
