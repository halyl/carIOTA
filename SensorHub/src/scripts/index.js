const {ipcRenderer} = require('electron');
const STREAM = require('./classes/stream');
const MAPSTYLE = require('./includes/style/map');

let streams = [];
let selected;
let map;

let running = false;

function init() {

  let location = {lat: 47.07, lng: 15.43};
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 15,
    center: location,
    disableDefaultUI: true,
    styles: MAPSTYLE
  });

  /* prototyping */
  /*
    let ROOTS = ['ONXDTKYBGKGUTAHLMSIZKDBJQHQXWFHSWZJMQTPONYPXGMCFIJGLI9KTASGOL9EFYRHIYLSXGDVVOPLKT',
                  'DULFOPIOOHWVRDVH9QHZZFEDHRUDWYS9MSY9XTYOEDO9JB9RRJPNUG9ERZCHUVSEDYYWJREELQUXUDFJR',
                   'PE9KCPMWZKLXIUDKSBFMYGPLFCSJFSAGKXIUHDQDYIGEOKIRTJRZKHMFYJYBSOHQGVHEEJWVBLHMLDNVI']

    ROOTS.forEach(root => {
      addStream(root);
    })

    fetchStream(0);
    */
}

ipcRenderer.on('nodeInfo', (event, packet) => {
  $("#iriVersion").html(packet.appVersion);
  $("#syncState").html(Math.abs(packet.latestSolidSubtangleMilestoneIndex - packet.latestMilestoneIndex) < 5 ? 'Yes' : 'No');
});

$("#stream_add").keypress(function (_e) {
  if (_e.which === 13 && _e.target.value != '') {

    addStream(_e.target.value);
    _e.target.value = '';
  }
});

ipcRenderer.on('setRoot', (event, id, _newRoot) => {

  streams[id].root = _newRoot;
  /* next stream */
  setTimeout(fetchStream, 1000, ++id);
});

ipcRenderer.on('fetchPacket', (event, _packet, id) => {

  if (streams[id].id == '') {

    $('#intAirTemp_ctx').children().hide();
    $('#vehSpd_ctx').children().hide();
    $('#coolTemp_ctx').children().hide();
    $('#engSpd_ctx').children().hide();

    $('#intAirTemp_ctx').append('<canvas id="' + streams[id].firstRoot + '_intakeAirTemperature_ctx"></canvas>');
    $('#vehSpd_ctx').append('<canvas id="' + streams[id].firstRoot + '_vehicleSpeed_ctx"></canvas>');
    $('#coolTemp_ctx').append('<canvas id="' + streams[id].firstRoot + '_coolantTemperature_ctx"></canvas>');
    $('#engSpd_ctx').append('<canvas id="' + streams[id].firstRoot + '_engineSpeed_ctx"></canvas>');
  }

  $('#' + streams[id].streamLabel).html(_packet.id);
  streams[id].id = _packet.id;

  let location = {lat: _packet.location.lat, lng: _packet.location.lng};
  streams[id].location = location;
  streams[id].marker.setPosition(location);

  streams[id].lastUpdate = _packet.timestamp;

  /* for prototyping */
  let d1 = {'intakeAirTemperature': _packet.data.intakeAirTemperature}
  streams[id].addData(d1, _packet.timestamp);
  let d2 = {'vehicleSpeed': _packet.data.vehicleSpeed}
  streams[id].addData(d2, _packet.timestamp);
  let d3 = {'coolantTemperature': _packet.data.coolantTemperature}
  streams[id].addData(d3, _packet.timestamp);
  let d4 = {'engineSpeed': _packet.data.engineSpeed}
  streams[id].addData(d4, _packet.timestamp);

  if (selected != null && selected == id) {
    select(id);
  }
});

function fetchStream (id) {

  id = id > streams.length - 1 ? 0 : id;

  highlight(id);
  ipcRenderer.send('fetchRoot', streams[id].root, id);
}

function select (id) {

  $('#stream_feed > div').each(function () {
    $(this).removeClass('active');
  });

  $('#label_' + id).addClass('active');
  selected = id;

  map_panTo(streams[id].location);
  output();
}

function addStream (root) {
  let s = new STREAM(root);
  let id = streams.length;
  s.streamLabel= 'label_' + id + '_title';
  streams.push(s);

  let new_label = '<div class="stream_label" id="label_'
  + id + '" onclick="select(' + id + ');">' + '<h5 id="'
  + s.streamLabel+ '">...' + '</h5><span id="sync_indicator_'
  + id + '" class="label label-white">< 10 sec<span></div>';

  $('#stream_feed').append(new_label);

  selected = id;

  if (running == false) {
    running = true;
    fetchStream(0);
  }
}

function map_panTo (location) {
  map.panTo(location);
}

function output () {

 if (streams[selected].datasets == undefined)
  return;

  let data = streams[selected].datasets;


  // SET OUTPUT

  $('#title').text(streams[selected].id);
  $('#loc').text('Lat: ' + streams[selected].location.lat + ' Lng: ' + streams[selected].location.lng);
  $('#intAirTemp').text(data.intakeAirTemperature[data.intakeAirTemperature.length - 1]);
  $('#vehSpd').text(data.vehicleSpeed[data.vehicleSpeed.length - 1]);
  $('#coolTemp').text(data.coolantTemperature[data.coolantTemperature.length - 1]);
  $('#engSpd').text(data.engineSpeed[data.engineSpeed.length - 1]);


  // SET CHARTS

  $('#intAirTemp_ctx').children().hide();
  $('#coolTemp_ctx').children().hide();
  $('#vehSpd_ctx').children().hide();
  $('#engSpd_ctx').children().hide();

  $('#' + streams[selected].firstRoot + '_intakeAirTemperature_ctx').show();
  $('#' + streams[selected].firstRoot + '_vehicleSpeed_ctx').show();
  $('#' + streams[selected].firstRoot + '_coolantTemperature_ctx').show();
  $('#' + streams[selected].firstRoot + '_engineSpeed_ctx').show();


  //SET HISTORY

  $('#history_title').html(streams[selected].id);
  $('#history_table').html('');

  Object.keys(data).forEach(function (key) {
    $('#history_table').append('<h4>' + key + ':</h4></br>');
    data[key].forEach(function (value) {
      $('#history_table').append('&nbsp&nbsp&nbsp&nbsp' + value + '</br>');
    })
});
}

function highlight (id) {

  $('#stream_feed > div > span').each(function () {
    $(this).removeClass('highlight');
  });

  $('#sync_indicator_' + id).addClass('highlight');
}

$("#stream_delete").click(function (_e) {
  if (confirm('Are you sure you want to delete \"' + streams[selected].id + '\"?')) {
    alert('Im sorry, can\'t do that for now.');
  } else {
  }
});
