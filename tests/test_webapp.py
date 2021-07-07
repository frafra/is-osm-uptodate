from seleniumbase import BaseCase
from seleniumbase.config import settings
from parameterized import parameterized

from common import URL

buttons = 'creation lastedit revisions frequency'.split()

class TestWebapp(BaseCase):
    def test_open_home(self):
        self.set_window_size('640', '480')
        self.open(URL)
        self.assert_element("#map a.leaflet-control-zoom-out",
            timeout=settings.EXTREME_TIMEOUT)

    def test_js_errors(self):
        self.test_open_home()
        self.assert_no_js_errors()

    def test_404_errors(self):
        self.test_open_home()
        self.assert_no_404_errors()

    @parameterized.expand(buttons)
    def test_tabs(self, button):
        self.test_open_home()
        self.execute_script('document.getElementById("'+button+'").click()')
        self.assert_no_js_errors()
        self.assert_no_404_errors()
