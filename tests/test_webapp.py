from common import URL
from parameterized import parameterized
from seleniumbase import BaseCase
from seleniumbase.config import settings

buttons = "creation lastedit revisions frequency".split()


class TestWebapp(BaseCase):
    def test_open_home(self):
        self.set_window_size("768", "432")
        self.open(URL)
        self.assert_text(
            "least recently updated", timeout=settings.EXTREME_TIMEOUT
        )

    def test_js_errors(self):
        self.test_open_home()
        self.assert_no_js_errors()

    @parameterized.expand(buttons)
    def test_tabs(self, button):
        self.test_open_home()
        self.execute_script(
            'document.getElementById("' + button + '").click()'
        )
        self.assert_no_js_errors()
