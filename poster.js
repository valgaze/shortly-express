var request = require("request");

var options = {
        'method': 'POST',
        'uri': 'http://127.0.0.1:4568/links',
        'json': {
                url: "http://www.wired.com",
                title: "test123",
                base_url: "http://localhost:4568"

        }
      };
      request(options, function(error, res, body) {
        console.log("POSTED COMPLETE");
        console.log("The body is", body);
      })