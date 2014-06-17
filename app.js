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

    data: {},
    apiRoot: 'https://{{setting.intercomAppID}}:{{setting.intercomAPIKey}}@api.intercom.io',

    Base64: {
      _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

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
    },

    filterMetadata: function(data){
      // Metadata fields to grab from Intercom
      var fields = ['phone', 'marketer', 'pages', 'domains', 'clients',
                    'api keys'];

      // Store those fields in array
      var metadata = [];
      for ( var i = 0 ; i < fields.length ; i ++ ){
        if ( data[ fields[i] ] || data[ fields[i] ] === 0 ){

          // Custom data displays
          if ( fields[i] === 'pages' ) {
            data[ fields[i] ] = data[ fields[i] ] +
                                ' (' + data['published pages'] + ' published)';
          }

          if ( fields[i] === 'marketer' ) {
            data[ fields[i] ] = data[ fields[i] ].toTitleCase();
          }

          metadata.push({
            field : fields[i].replace(/_/g, ' ').toTitleCase(),
            data : data[ fields[i] ]
          });
        }
      }
      return metadata;
    },

    requests: {

      getUser: function () {
        return {
          url: this.apiRoot + '/users/?email=' + this.ticket().requester().email(),
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllTags: function() {
        return {
          url: this.apiRoot + '/tags',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      },

      getAllSegments: function() {
        return {
          url: this.apiRoot + '/segments',
          type: 'GET',
          dataType: 'json',
          secure: true
        };
      }

    },

    events: {
      'app.activated': function() {
        // Show the default button straightaway
        this.switchTo('account', {
          link: 'https://app.intercom.io/apps/' + this.setting('intercomAppID') + '/users/show?email=' + this.ticket().requester().email(),
          name: this.ticket().requester().name(),
          metadata: []
        });

        // Make the API calls
        this.ajax('getUser');
        this.ajax('getAllTags');
        this.ajax('getAllSegments');
      },

      'getUser.done': function(user) {
        this.data.user = {};
        this.data.user.name = user.name;
        this.data.user.user_id = user.user_id;
        this.data.user.tags = user.tags.tags;
        this.data.user.segments = user.segments.segments;
        this.data.user.metadata = this.filterMetadata(user.custom_attributes);
        if ( this.data.tags && this.data.segments ) this.trigger('allCallsDone');
      },

      'getAllTags.done': function(tags) {
        this.data.tags = tags.tags || [];
        if ( this.data.user && this.data.segments ) this.trigger('allCallsDone');
      },

      'getAllSegments.done': function(segments) {
        this.data.segments = segments.segments || [];
        if ( this.data.user && this.data.tags ) this.trigger('allCallsDone');
      },

      'allCallsDone': function() {
        if ( !this.data.user || !this.data.tags || !this.data.segments ) return false;

        // Callback when all Ajax requests are complete
        console.log('Data from Intercom:', this.data );

        // Get the friendly name of each tag and segment
        var that = this;
        _.each(this.data.user.tags, function(userTag) {
          var tagName = _.find(that.data.tags, function(tag){
            return tag.id === userTag.id;
          }).name;
          userTag.name = tagName;
        });
        _.each(this.data.user.segments, function(userSegment, key) {
          var segmentName = _.find(that.data.segments, function(segment){
            return segment.id === userSegment.id;
          });
          if ( segmentName ) {
            userSegment.name = segmentName.name;
          }else{
            delete that.data.user.segments[key];
          }
        });

        console.log('Processed data from Intercom:', this.data );

      },

      'getUser.fail': function() {
        // Show the 'no account' message
        this.switchTo('no-account', {
          link: 'https://app.intercom.io/a/apps/' + this.setting('intercomAppID') + '/users/segments/active',
          email: this.ticket().requester().email()
        });
      },

      'click #search-button': function(event) {
        var search = this.$('#search-field').val();
        search = { search: search };
        search = JSON.stringify(search);
        search = this.Base64.encode(search);
        this.$('form#search-form').attr('action', 'https://app.intercom.io/a/apps/eqe7kbcu/users/segments/all:' + search).submit();
      }
    }

  };

}());
