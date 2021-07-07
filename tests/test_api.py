import json
import urllib.parse
import urllib.request

from common import URL


class TestApi:
    def get_data(self):
        params = urllib.parse.urlencode(
            {
                "minx": 9.18987035751343,
                "miny": 45.46393453038024,
                "maxx": 9.19158697128296,
                "maxy": 45.46452522062808,
            }
        )
        with urllib.request.urlopen(URL + "/api/getData?" + params) as resp:
            decoded = json.load(resp)
        return decoded

    def test_json(self):
        data = self.get_data()
        assert "features" in data
        assert len(data["features"]) > 0
        for key in "geometry type properties".split():
            for feature in data["features"]:
                assert key in feature
