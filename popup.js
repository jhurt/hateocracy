(function () {
  var allFriends = [];
  var allFollowers = [];

  function onError(message) {
    alert(message);
  }

  function getUsername(callback) {
    chrome.cookies.get({url: 'https://www.fitocracy.com/', name: 'km_ni'}, function(cookie) {
      if(cookie == null) {
        onError('Cannot find your Fitocracy username :(');
      }
      else {
        callback(cookie.value);
      }
    });
  }

  function getFriends(username, page, callback) {
    var url = 'https://www.fitocracy.com/get-user-friends/?user=' + encodeURIComponent(username) + '&following=true';
    if(page != 0) {
      url += '&page=' + page;
    }
    $.ajax({
      url: url,
      type: 'GET',
      timeout: 10000,
      success:function (friends) {
        if(friends.length == 0) {
          callback();
        }
        else {
          allFriends = _.union(friends, allFriends);
          getFriends(username, page+1, callback);
        }
      },
      error:function (e) {
        onError('Failed to get Fitocracy friends :(');
      }
    });
  }

  function getFollowers(username, page, callback) {
    var url = 'https://www.fitocracy.com/get-user-friends/?user=' + encodeURIComponent(username) + '&followers=true';
    if(page != 0) {
      url += '&page=' + page;
    }
    $.ajax({
      url: url,
      type: 'GET',
      timeout: 10000,
      success:function (followers) {
        if(followers.length == 0) {
          callback();
        }
        else {
          allFollowers = _.union(followers, allFollowers);
          getFollowers(username, page+1, callback);
        }
      },
      error:function (e) {
        onError('Failed to get Fitocracy followers :(');
      }
    });
  }

  //TODO: this is getting a 403 response
  function unfollow(id, callback) {
    $.ajax({
      url: 'https://www.fitocracy.com/profile_facepile/',
      type: 'POST',
      data: {'profile_user_id': id},
      timeout: 10000,
      success:function () {
        callback();
      },
      error:function (e) {
        alert(e);
      }
    });
  }

  function showHaters(haters) {
    $('#loading').hide();
    $('#refresh-button').show();
    var hatersDiv = $('#haters');
    _.each(haters, function(hater, i) {
      var markup = '<img src="https://s3.amazonaws.com/static.fitocracy.com/site_media/' + hater['pic'] + '" class="hater"> '
      markup += '<a target="_blank" href="https://www.fitocracy.com/profile/' + hater['username'] + '">' + hater['username'] + '</a>';
      //markup += '<button id="' + hater['id'] + '" class="unfollow-button" type="button">Unfollow</button>';
      markup += '<br>';
      hatersDiv.append(markup);
    });
  }

  function refreshHaters() {
    $('#haters').empty();
    $('#loading').show();
    $('#refresh-button').hide();
    allFollowers = [];
    allFriends = [];
    getUsername(function(username) {
      getFriends(username, 0, function() {
        getFollowers(username, 0, function() {
          var allUserIds = _.union(_.pluck(allFriends, 'id'), _.pluck(allFollowers, 'id'));
          var haterIds = _.difference(allUserIds, _.intersection(_.pluck(allFriends, 'id'), _.pluck(allFollowers, 'id')));
          var haters = _.filter(allFriends, function(friend) { return _.contains(haterIds, friend['id']); });
          haters.sort(function(a,b) { if (a['username'].toLowerCase() > b['username'].toLowerCase()) { return 1; }
                                      if (a['username'].toLowerCase() < b['username'].toLowerCase()) { return -1; }
                                      return 0; });
          localStorage.setItem('haters', JSON.stringify(haters));
          showHaters(haters);
        });
      });
    });
  }

  $(document).ready(function () {
    var storedHatersString = localStorage.getItem('haters');
    if(storedHatersString) {
      var haters = JSON.parse(storedHatersString);
      showHaters(haters);
    }
    else {
      refreshHaters();
    }

    $('#refresh-button').click(function(e) {
      e.preventDefault();
      refreshHaters();
    });
  });

  $(document).on('click', '.unfollow-button', function(e) {
    e.preventDefault();
    var id = $(this).prop('id');
    unfollow(id, function() {
      $(this).prop('disabled', true);
      $(this).html('Unfollowed!');
    });
  });

}
)();