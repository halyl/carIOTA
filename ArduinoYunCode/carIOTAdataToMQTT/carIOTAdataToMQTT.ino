/***************************************************
Fetching a car sensor data from OBD-II port and send via MQTT protocol
@halyl July,2018

https://en.wikipedia.org/wiki/OBD-II_PIDs

 ****************************************************/
#include <Bridge.h>
#include <Console.h>
#include <BridgeClient.h>
#include <ArduinoJson.h>
#include "Adafruit_MQTT.h"
#include "Adafruit_MQTT_Client.h"
#include <SPI.h>
#include "mcp_can.h"

const int SPI_CS_PIN = 9;
MCP_CAN CAN(SPI_CS_PIN);                                
#define PID_ENGIN_PRM       0x0C
#define PID_VEHICLE_SPEED   0x0D
#define PID_COOLANT_TEMP    0x05
#define CAN_ID_PID          0x7DF

float nEng=1000.0;
float T_W_O=80.0;
float T_IA= 25.0;
float v_Veh= 50.0;

#define SERVER    "m20.cloudmqtt.com"
#define PORT      18784
#define USERNAME  "typeHereYourUsername"
#define PASSWORD  "typeHereYourPassword"

BridgeClient client;
Adafruit_MQTT_Client mqtt(&client, SERVER, PORT, USERNAME, PASSWORD);
Adafruit_MQTT_Publish iota = Adafruit_MQTT_Publish(&mqtt, "halyl/feeds/iota");

void set_mask_filt()
{
    CAN.init_Mask(0, 0, 0x7FC);
    CAN.init_Mask(1, 0, 0x7FC);
    CAN.init_Filt(0, 0, 0x7E8);                 
    CAN.init_Filt(1, 0, 0x7E8);
    CAN.init_Filt(2, 0, 0x7E8);
    CAN.init_Filt(3, 0, 0x7E8);
    CAN.init_Filt(4, 0, 0x7E8); 
    CAN.init_Filt(5, 0, 0x7E8);
}

void sendPidPeriodic()
{   
    unsigned char tmp1[8] = {0x02, 0x01, 0x0C, 0, 0, 0, 0, 0};
    unsigned char tmp2[8] = {0x02, 0x01, 0x05, 0, 0, 0, 0, 0};
    unsigned char tmp3[8] = {0x02, 0x01, 0x0D, 0, 0, 0, 0, 0};
    unsigned char tmp4[8] = {0x02, 0x01, 0x0F, 0, 0, 0, 0, 0};
    CAN.sendMsgBuf(CAN_ID_PID, 0, 8, tmp1);
    CAN.sendMsgBuf(CAN_ID_PID, 0, 8, tmp2);
    CAN.sendMsgBuf(CAN_ID_PID, 0, 8, tmp3);
    CAN.sendMsgBuf(CAN_ID_PID, 0, 8, tmp4);       
}

void setup() {
  Bridge.begin();
  Console.begin();
  
    Serial.begin(115200);
    while (CAN_OK != CAN.begin(CAN_500KBPS))    // init can bus : baudrate = 500k
    {
        Serial.println("CAN BUS Shield init fail, Init CAN BUS Shield again");
        delay(100);
    }
    Serial.println("CAN BUS Shield init ok!");
    set_mask_filt();
}

String sPayload;
char* cPayload;

void loop() { 

    taskCanRecv();
    sendPidPeriodic();

  MQTT_connect();
    analogReference(EXTERNAL);
    StaticJsonBuffer<300> jsonBuffer;
    JsonObject& JSONencoder = jsonBuffer.createObject();
    JSONencoder["device"] = "Arduino Yun";
    JSONencoder["UUT"] = "ECU"; 
    JSONencoder["VehicleSpeed"] = v_Veh; 
    JSONencoder["EngineSpeed"] = nEng;
    JSONencoder["IntakeAirTemp"] = T_IA;
    JSONencoder["CoolantTemp"] = T_W_O;

    sPayload = "";
  JSONencoder.prettyPrintTo(sPayload);
    cPayload = &sPayload[0u];

    //Console.print(cPayload);
    //Console.print("...");

    if (! iota.publish(cPayload)) {
        //Console.println(F("Failed"));
    } else {
        //Console.println(F("OK!"));
    }

  if(! mqtt.ping()) {
    //Console.println(F("MQTT Ping failed."));
  }
}

void MQTT_connect() {
  int8_t ret;
  if (mqtt.connected()) {
    return;
  }

  while ((ret = mqtt.connect()) != 0) { // connect will return 0 for connected
       Console.println(mqtt.connectErrorString(ret));
       Console.println("Retrying MQTT connection in 3 seconds...");
       mqtt.disconnect();
       delay(3000);  // wait 3 seconds
  }
  //Console.println("MQTT Connected!");
}

void taskCanRecv()
{
    unsigned char len = 0;
    unsigned char buf[8];

    if(CAN_MSGAVAIL == CAN.checkReceive()){                   // check if get data
        //Serial.println("searching for PID");
        CAN.readMsgBuf(&len, buf);    // read data,  len: data length, buf: data buf
        Serial.println("\r\n-----");
        //Serial.print("Get Data From id: ");
        //Serial.println(CAN.getCanId(), HEX);
        //Serial.print("data len = ");
        //Serial.println(len);
  
       //for(int i = 0; i<len; i++)    // print the data
        //{
            //Serial.print("0x");
            //Serial.print(buf[i], HEX);
            //Serial.print("\t");
            //Serial.println();
        //}   
           if(buf[2]==0x0C&&buf[1]==0x41){        // 0x0C Engine speed RPM
        nEng = ((buf[3]*256) + buf[4])/4;
        Serial.println();
        Serial.print("Engine speed RPM: ");
        Serial.println(nEng);
        }
           else if (buf[2]==0x5&&buf[1]==0x41){    // 0x05 Coolant temperature
        T_W_O= (buf[3])-40;
       Serial.println();    
       Serial.print("Coolant temperature: ");
       Serial.println(T_W_O);
              }         
           else if (buf[2]==0xD&&buf[1]==0x41){    // 0x0D Vehicle speed
        v_Veh= buf[3];
        Serial.println(); 
        Serial.print("Vehicle speed: ");
        Serial.println(v_Veh);
            }
            else if (buf[2]==0x0F&&buf[1]==0x41){    // 0x0F Intake Air Tempterature
        T_IA= (buf[3])-40;
        Serial.println(); 
        Serial.print("Intake Air Tempterature: ");
        Serial.println(T_IA);
            }
  }
}
// END FILE
