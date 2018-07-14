'use strict'

const Mam = require('./mam.node.js')
const IOTA = require('iota.lib.js')
const iota = new IOTA({ 'provider': 'http://nodes.iota.fm:80' })
//const iota = new IOTA({ 'provider': 'http://iota-node.kopciak.at:14265' })
//const iota = new IOTA({ 'provider': 'https://nodes.thetangle.org:443' })
//const iota = new IOTA({ 'provider': 'https://potato.iotasalad.org:14265'})


let mamState = Mam.init(iota)

const publish = async packet => {
  let message = Mam.create(mamState, packet)
  mamState = message.state
  console.log('Root: ', message.root)
  console.log('https://thetangle.org/mam/'+ message.root);
  await Mam.attach(message.payload, message.address)
}

const publishTangle = function(jsonObject){
	let dataT = iota.utils.toTrytes(JSON.stringify(jsonObject))
	publish(dataT)
}

module.exports={attach:publishTangle}




