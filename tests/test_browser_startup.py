"""A browser handler can wait for its first HTTP response before returning."""
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen

from workbench import serve


class BrowserStartupTest(unittest.TestCase):
    def test_browser_can_load_session_before_open_returns(self):
        seen = []
        finished = threading.Event()

        def browser(url):
            origin, token = url.split("/#")
            seen.append(origin)
            try:
                with urlopen(origin, timeout=2) as response:
                    self.assertEqual(response.status, 200)
                request = Request(origin + "/api/current", headers={"Authorization": "Bearer " + token})
                with urlopen(request, timeout=2) as response:
                    self.assertEqual(response.status, 204)
                seen.append("loaded")
            finally:
                finished.set()
                def shutdown():
                    request = Request(origin + "/api/exit", method="POST", headers={"Authorization": "Bearer " + token})
                    with urlopen(request, timeout=5):
                        pass
                threading.Thread(target=shutdown, daemon=True).start()
            return True

        with patch("workbench.webbrowser.open", side_effect=browser), patch("builtins.print"):
            serve()
        self.assertTrue(finished.is_set())
        self.assertEqual(seen[1:], ["loaded"])
