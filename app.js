(function() {

  String.prototype.toTitleCase = function() {
    var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

    return this.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title){
      if (index > 0 && index + match.length !== title.length &&
        match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
        (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
        title.charAt(index - 1).search(/[^\s-]/) < 0) {
        return match.toLowerCase();
      }

      if (match.substr(1).search(/[A-Z]|\../) > -1) {
        return match;
      }

      return match.charAt(0).toUpperCase() + match.substr(1);
    });
  };

  return {

    requests: {

    getUser: function () {
      return {
        url: 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io/' +
             'users/?email=' + this.ticket().requester().email(),
        type: 'GET',
        dataType: 'json',
        secure: true
      };
    }

    },

    events: {
      'app.activated': function() {
        // Show the default button
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?email=' + this.ticket().requester().email(),
          name: this.ticket().requester().name(),
          metadata: []
        });

        // Make the API call
        this.ajax('getUser');
      },

      'getUser.done': function(data) {
        console.log('Data from Intercom:', data);

        if (!data.user_id) return false;

        // Metadata fields to grab from Intercom
        var fields = ['phone', 'marketer', 'pages', 'domains', 'clients',
                      'api keys'];

        // Store those fields in array
        var metadata = [];
        for ( var i = 0 ; i < fields.length ; i ++ ){
          if ( data.custom_attributes[ fields[i] ] || data.custom_attributes[ fields[i] ] === 0 ){

            // Custom data displays
            if ( fields[i] === 'pages' ) {
              data.custom_attributes[ fields[i] ] = data.custom_attributes[ fields[i] ] +
                                                    ' (' + data.custom_attributes['published pages'] + ' published)';
            }

            if ( fields[i] === 'marketer' ) {
              data.custom_attributes[ fields[i] ] = data.custom_attributes[ fields[i] ].toTitleCase();
            }

            metadata.push({
              field : fields[i].replace(/_/g, ' ').toTitleCase(),
              data : data.custom_attributes[ fields[i] ]
            });
          }
        }

        // Show the button and data
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?user_id=' + data.user_id,
          name: data.name,
          metadata: metadata
        });
      },

      'getUser.fail': function() {
        // Show the 'no account' message
        this.switchTo('no-account', {
          link: 'https://app.intercom.io/a/apps/' + this.setting('intercomAppID') + '/users/segments/active',
          email: this.ticket().requester().email()
        });
      },

      'click #search-button': function(event) {

        var Base64 = {

          // private property
          _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

          // public method for encoding
          encode : function (input) {
              var output = "";
              var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
              var i = 0;
              input = Base64._utf8_encode(input);
              while (i < input.length) {
                  chr1 = input.charCodeAt(i++);
                  chr2 = input.charCodeAt(i++);
                  chr3 = input.charCodeAt(i++);
                  enc1 = chr1 >> 2;
                  enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                  enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                  enc4 = chr3 & 63;
                  if (isNaN(chr2)) {
                      enc3 = enc4 = 64;
                  } else if (isNaN(chr3)) {
                      enc4 = 64;
                  }
                  output = output +
                  this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                  this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
              }
              return output;
          },

          // public method for decoding
          decode : function (input) {
              var output = "";
              var chr1, chr2, chr3;
              var enc1, enc2, enc3, enc4;
              var i = 0;
              input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
              while (i < input.length) {
                  enc1 = this._keyStr.indexOf(input.charAt(i++));
                  enc2 = this._keyStr.indexOf(input.charAt(i++));
                  enc3 = this._keyStr.indexOf(input.charAt(i++));
                  enc4 = this._keyStr.indexOf(input.charAt(i++));
                  chr1 = (enc1 << 2) | (enc2 >> 4);
                  chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                  chr3 = ((enc3 & 3) << 6) | enc4;
                  output = output + String.fromCharCode(chr1);
                  if (enc3 != 64) {
                      output = output + String.fromCharCode(chr2);
                  }
                  if (enc4 != 64) {
                      output = output + String.fromCharCode(chr3);
                  }
              }
              output = Base64._utf8_decode(output);
              return output;
          },

          // private method for UTF-8 encoding
          _utf8_encode : function (string) {
              string = string.replace(/\r\n/g,"\n");
              var utftext = "";
              for (var n = 0; n < string.length; n++) {
                  var c = string.charCodeAt(n);
                  if (c < 128) {
                      utftext += String.fromCharCode(c);
                  }
                  else if((c > 127) && (c < 2048)) {
                      utftext += String.fromCharCode((c >> 6) | 192);
                      utftext += String.fromCharCode((c & 63) | 128);
                  }
                  else {
                      utftext += String.fromCharCode((c >> 12) | 224);
                      utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                      utftext += String.fromCharCode((c & 63) | 128);
                  }
              }
              return utftext;
          },

          // private method for UTF-8 decoding
          _utf8_decode : function (utftext) {
              var string = "",
                  i = 0,
                  c = 0,
                  c1 = 0,
                  c2 = 0,
                  c3 = 0;
              while ( i < utftext.length ) {
                  c = utftext.charCodeAt(i);
                  if (c < 128) {
                      string += String.fromCharCode(c);
                      i++;
                  }
                  else if((c > 191) && (c < 224)) {
                      c2 = utftext.charCodeAt(i+1);
                      string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                      i += 2;
                  }
                  else {
                      c2 = utftext.charCodeAt(i+1);
                      c3 = utftext.charCodeAt(i+2);
                      string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                      i += 3;
                  }
              }
              return string;
          }
        };

        var search = this.$('#search-field').val();
        search = { search: search };
        search = JSON.stringify(search);
        search = Base64.encode(search);
        this.$('form#search-form').attr('action', 'https://app.intercom.io/a/apps/eqe7kbcu/users/segments/all:' + search).submit();
      }
    }

  };

}());
