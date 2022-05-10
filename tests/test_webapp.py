from common import URL
from parameterized import parameterized
from seleniumbase import BaseCase

buttons = "creation lastedit revisions frequency".split()


class TestWebapp(BaseCase):
    def test_open_home(self):
        self.set_window_size("1024", "1024")
        self.open(URL)

    def test_js_errors(self):
        self.test_open_home()
        self.assert_no_js_errors()

    @parameterized.expand(buttons)
    def test_tabs(self, button):
        self.test_open_home()
        self.click("button#fetch")
        self.execute_script(
            'document.getElementById("' + button + '").click()'
        )
        self.assert_no_js_errors()
