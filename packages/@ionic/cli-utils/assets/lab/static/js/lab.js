var $ = document.querySelector.bind(document);

var API_ROOT = '/ionic-lab/api/v1';

var APP_CONFIG = {};

function loadAppConfig() {
  var req = new XMLHttpRequest();
  req.addEventListener('load', function(e) {
    setAppConfig(JSON.parse(req.response));
  });
  req.open('GET', API_ROOT + '/app-config', true);
  req.send(null);
}

function setAppConfig(data) {
  APP_CONFIG = data;
}

function buildMenu() {
  buildComponentsMenu();
  var sidebar = $('#sidebar');
  var topLevels = sidebar.querySelectorAll('#menu > li > a');

  var lastMenuConfig = window.localStorage.getItem('ionic_labmenu');
  if (lastMenuConfig === 'true' || lastMenuConfig === null) {
    sidebar.classList.remove('hidden');
  }

  Array.prototype.map.call(topLevels, function(a) {
    if (!a.href) {
      a.addEventListener('click', function(e) {
        if (a.parentNode.classList.contains('expanded')) {
          a.parentNode.classList.remove('expanded');
        } else {
          a.parentNode.classList.add('expanded');
        }
        e.preventDefault();
      });
    }
  });

  $('#view-ad').addEventListener('click', function(e) {
    var win = window.open('http://view.ionic.io/', '_blank');
    win.focus();
  });

  var toggleMenu = function(e) {
    if (sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('hidden');
      window.localStorage.setItem('ionic_labmenu', 'true');
    } else {
      sidebar.classList.add('hidden');
      window.localStorage.setItem('ionic_labmenu', 'false');
    }
  };

  $('#menu-toggle').addEventListener('click', toggleMenu);
  $('#sidebar .close').addEventListener('click', toggleMenu);
}

function buildComponentsMenu() {
  var items = [{"href":"http://ionicframework.com/docs/components/#overview","title":"Overview"},{"href":"http://ionicframework.com/docs/components/#action-sheets","title":"Action Sheets"},{"href":"http://ionicframework.com/docs/components/#alert","title":"Alerts"},{"href":"http://ionicframework.com/docs/components/#badges","title":"Badges"},{"href":"http://ionicframework.com/docs/components/#buttons","title":"Buttons"},{"href":"http://ionicframework.com/docs/components/#cards","title":"Cards"},{"href":"http://ionicframework.com/docs/components/#checkbox","title":"Checkbox"},{"href":"http://ionicframework.com/docs/components/#datetime","title":"DateTime"},{"href":"http://ionicframework.com/docs/components/#fabs","title":"FABs"},{"href":"http://ionicframework.com/docs/components/#gestures","title":"Gestures"},{"href":"http://ionicframework.com/docs/components/#grid","title":"Grid"},{"href":"http://ionicframework.com/docs/components/#icons","title":"Icons"},{"href":"http://ionicframework.com/docs/components/#inputs","title":"Inputs"},{"href":"http://ionicframework.com/docs/components/#lists","title":"Lists"},{"href":"http://ionicframework.com/docs/components/#loading","title":"Loading"},{"href":"http://ionicframework.com/docs/components/#menus","title":"Menus"},{"href":"http://ionicframework.com/docs/components/#modals","title":"Modals"},{"href":"http://ionicframework.com/docs/components/#navigation","title":"Navigation"},{"href":"http://ionicframework.com/docs/components/#popovers","title":"Popover"},{"href":"http://ionicframework.com/docs/components/#radio","title":"Radio"},{"href":"http://ionicframework.com/docs/components/#range","title":"Range"},{"href":"http://ionicframework.com/docs/components/#searchbar","title":"Searchbar"},{"href":"http://ionicframework.com/docs/components/#segment","title":"Segment"},{"href":"http://ionicframework.com/docs/components/#select","title":"Select"},{"href":"http://ionicframework.com/docs/components/#slides","title":"Slides"},{"href":"http://ionicframework.com/docs/components/#tabs","title":"Tabs"},{"href":"http://ionicframework.com/docs/components/#toast","title":"Toast"},{"href":"http://ionicframework.com/docs/components/#toggle","title":"Toggle"},{"href":"http://ionicframework.com/docs/components/#toolbar","title":"Toolbar"}];

  var componentsMenu = $('#components-menu');
  items.map(function (i) {
    var l = document.createElement('li');
    var a = document.createElement('a');
    a.href = i.href;
    a.target = "_blank";
    a.innerText = i.title;
    l.appendChild(a);
    componentsMenu.appendChild(l);
  });
}

function tryShowViewPopup() {
  var view = window.localStorage.getItem('ionic_viewpop');

  if (!view) {
    $('#view-popup').style.display = 'block';
    $('#view-popup .close').addEventListener('click', function(e) {
      window.localStorage.setItem('ionic_viewpop', true);
      $('#view-popup').style.opacity = 0;
      setTimeout(function() {
        $('#view-popup').style.display = 'none';
      }, 200);
    });
    window.requestAnimationFrame(function() {
      $('#view-popup').style.opacity = 1;
    });
  }
}

// Bind the dropdown platform toggles
function bindToggles() {
  // Watch for changes on the checkboxes in the device dropdown
  var iphone = $('#device-iphone');
  var android = $('#device-android');
  var windows = $('#device-windows');

  var devices = [iphone, android, windows];
  for(var i in devices) {
    devices[i].addEventListener('change', function(e) {
      var device = this.name;
      console.log('Device changed', device, this.checked);

      showDevice(device, this.checked);
      saveLastDevices(device, this.checked);
    });
  }
}

// Show one of the devices
function showDevice(device, isShowing) {
  $('#device-' + device).checked = isShowing;

  var rendered = $('#' + device);
  if(!rendered) {
    var template = $('#' + device + '-frame-template');
    var clone = document.importNode(template, true);
    $('preview').appendChild(clone.content);
    //check for extra params in location.url to pass on to iframes
    var params = document.location.href.split('?');
    if (params) {
      var newparams = params[params.length - 1];
      var oldsrc = $('preview .frame').getAttribute('src');
      $('preview .frame').setAttribute('src', oldsrc + '&' + newparams);
    }
  } else {
    rendered.style.display = isShowing ? '' : 'none';
  }
}

function saveLastDevices(newDevice, didAdd) {
  var last = window.localStorage.getItem('ionic_lastdevices');
  if(!last && didAdd) {
    window.localStorage.setItem('ionic_lastdevices', newDevice);
    return;
  }
  var devices = last.split(',');
  var di = devices.indexOf(newDevice);
  if(di == -1 && didAdd) {
    window.localStorage.setItem('ionic_lastdevices', devices.join(',') + ',' + newDevice);
  } else if(di >= 0) {
    devices.splice(di, 1);
    window.localStorage.setItem('ionic_lastdevices', devices.join(','));
  }
}

function showLastDevices() {
  var last = window.localStorage.getItem('ionic_lastdevices');
  if(!last) {
    showDevice('iphone', true);
    return;
  }

  var devices = last.split(',');
  for(var i = 0; i < devices.length; i++) {
    showDevice(devices[i], true);
  }
}

function setCordovaInfo(data) {
  var el = $('#app-info');
  el.innerHTML = data.name + ' - v' + data.version;
  if(data.name) {
    document.title = data.name + ' - Ionic Lab';
  }
}

function loadCordova() {
  var req = new XMLHttpRequest();
  req.addEventListener('load', function(e) {
    setCordovaInfo(JSON.parse(req.response));
  });
  req.open('GET', API_ROOT + '/cordova', true);
  req.send(null);
}

//loadSearchIndex();
loadAppConfig();
buildMenu();
showLastDevices();
loadCordova();
bindToggles();
//tryShowViewPopup();
