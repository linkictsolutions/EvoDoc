# Workbook Extraction Summary

- File: `docs\source\excel\Coffee Doc-Praxis-V2.xlsm`
- Sheet count: 24

## Sheets
- Form Configuration
- Contract
- Shipping Instruction
- Bank & LC
- Contract-SI-LC
- Bookings
- Staffing
- Processing
- Coffee Test Letter
- Commercial Invoice(Permit)
- Commercial Invoice
- Commercial Invoice(ICC)
- Packing List(Permit)
- Packing List
- Packing List(ICC)
- SI
- Certificate of Quality
- Certificate of Weight
- WAY BILL
- COCG
- VGM
- ICO
- Cert Of Origin
- NON-GMO

## Focus Sheet Metrics
### Form Configuration
- State: `visible`
- Used range: rows 1-26, cols 1-11
- Formula cells: 0
- Labels sample:
  - A1:Seller Name | B1:PRAXIS  INTERNATIONAL BUSINESS PLC | G1:Email | H1:coffee@praxis.com.et
  - A2:Seller Address | B2:NIFAS SILK LAFTO SUB CITY, WOREDA  08, HOUSE NO 1986, ADDIS ABABA, ETHIOPIA. | G2:Phone | H2:0992454545
  - A3:Amharic Name | B3:ፕራክሲስ ኢንተርናሽናል ቢዝነስ ኅ/የ/የግ/ማህበር
  - A4:Item List | E4:UoM | H4:Weight | I4:Weight of Bags(Kg) | J4:Gross
  - E5:Bag of 60Kg | H5:60 | I5:0.75 | J5:60.75
  - E6:Bag of 50Kg | H6:50 | I6:0.625 | J6:50.625 | K6:ORIGIN
  - E7:Bag of 30Kg | H7:30 | I7:0.375 | J7:30.375 | K7:ETHIOPIA
  - E8:Kg

### Contract
- State: `visible`
- Used range: rows 1-65, cols 1-32
- Formula cells: 34
- Labels sample:
  - B1:Contract Information
  - B5:NO:
  - B7:Date:
  - B9:Buyers Name:
  - B11:Buyers Address:
  - B13:Item List: | C13:Quality:
  - C14:UoM(For Price): | D14:Lbs
  - C15:Unit (For Price): | D15:100
- Formula sample:
  - D19: `=(D16/D15)*D28`
  - D20: `=D26/60`
  - H20: `=D20*'Form Configuration'!I5`
  - D21: `=D19/D20`
  - D22: `=D26/50`
  - H22: `=D22*'Form Configuration'!I6`
  - D23: `=D19/D22`
  - D24: `=D26/30`

### Shipping Instruction
- State: `visible`
- Used range: rows 1-34, cols 1-10
- Formula cells: 0
- Labels sample:
  - B1:Shipping Instruction Information
  - B5:Destination( Port, Country):
  - B7:Shipping Line: | E7:Service Contract:
  - B9:Alternative 1: | E9:Service Contract: | H9:Selected:
  - B11:Alternative 2: | E11:Service Contract:
  - B13:Port of Loading:
  - B15:Quantity:
  - B16:Quality:

### Bank & LC
- State: `visible`
- Used range: rows 1-27, cols 1-9
- Formula cells: 0
- Labels sample:
  - B1:LC Information
  - G2:Bank Information
  - B4:LC No:
  - G5:Bank Permit:
  - B6:Bank Detail
  - B7:Swift Output | C7:Sender: | G7:Beneficiary Bank:
  - C8:Receiver
  - G9:Address of Bank:

### Contract-SI-LC
- State: `visible`
- Used range: rows 1-37, cols 1-11
- Formula cells: 68
- Labels sample:
  - F6:Contract | G6:Shipping Instruction | H6:Revised Shipping Instruction | I6:Letter of Credit (LC) | J6:Revised Letter of Credit | K6:Final
  - E7:Quality
  - E8:Buyers Name
  - E9:Buyers Address
  - E10:UoM(Packing):
  - E11:Quantity(Contract):
  - E12:Total Price:
  - E13:ORIGIN:
- Formula sample:
  - F7: `=Contract!D13`
  - G7: `='Shipping Instruction'!C16`
  - K7: `=IF(IF(J7<>"",J7,IF(I7<>"",I7,IF(H7<>"",H7,IF(G7<>"",G7,F7))))="","-",IF(J7<>"",J7,IF(I7<>"",I7,IF(H7<>"",H7,IF(G7<>"",G7,F7)))))`
  - F8: `=Contract!C9`
  - K8: `=IF(IF(J8<>"",J8,IF(I8<>"",I8,IF(H8<>"",H8,IF(G8<>"",G8,F8))))="","-",IF(J8<>"",J8,IF(I8<>"",I8,IF(H8<>"",H8,IF(G8<>"",G8,F8)))))`
  - F9: `=Contract!C11`
  - K9: `=IF(IF(J9<>"",J9,IF(I9<>"",I9,IF(H9<>"",H9,IF(G9<>"",G9,F9))))="","-",IF(J9<>"",J9,IF(I9<>"",I9,IF(H9<>"",H9,IF(G9<>"",G9,F9)))))`
  - F10: `=Contract!D17`

### Bookings
- State: `visible`
- Used range: rows 1-43, cols 1-10
- Formula cells: 10
- Labels sample:
  - B4:Booking Number:
  - B5:Shipping Line:
  - B6:Vessel Name:
  - B7:Voyage No:
  - B9:Free Days
  - G15:Add Column
  - A16:Vehicle No | B16:TRUCK/TRAILER | C16:Plate No. | D16:Driver's Name | E16:Driver Phone No. | F16:Driver Phone No. (DJIBOUTI) | G16:License No. | H16:Container No. | I16:Seal No. | J16:Tare Weight
  - A17:1 | B17:TRUCK | D17:ABEBE DEJENE | E17:0911138271 | F17:+253 77398162 | G17:05-R008141 | H17:MSDU121638/1 | I17:EU27646310 | J17:2220
- Formula sample:
  - D18: `=IF(D17="","",D17)`
  - G18: `=G17`
  - D20: `=IF(D19="","",D19)`
  - G20: `=G19`
  - D22: `=IF(D21="","",D21)`
  - G22: `=G21`
  - D24: `=IF(D23="","",D23)`
  - G24: `=G23`

### Staffing
- State: `visible`
- Used range: rows 1-31, cols 1-36
- Formula cells: 185
- Labels sample:
  - B1:Shipping Information
  - A3:Staffing Instruction & Report
  - A5:Vehicle No | B5:TRUCK/TRAILER | C5:Plate No. | D5:Driver's Name | E5:Driver Phone No. | F5:License No. | G5:Container No. | H5:Seal No. | I5:Seal No. V2 | J5:Cert No.
  - A6:1 | B6:TRUCK | H6:EU27646310 | J6:23
  - B7:TRAILER
  - A8:2 | B8:TRUCK
  - B9:TRAILER
  - A10:3 | B10:TRUCK
- Formula sample:
  - C6: `=IF(Bookings!C17="","",Bookings!C17)`
  - D6: `=IF(Bookings!D17="","",Bookings!D17)`
  - E6: `=IF(Bookings!E17="","",Bookings!E17)`
  - F6: `=IF(Bookings!G17="","",Bookings!G17)`
  - G6: `=IF(Bookings!H17="","",Bookings!H17)`
  - L6: `=IF(Bookings!J17="","",Bookings!J17)`
  - C7: `=IF(Bookings!C18="","",Bookings!C18)`
  - D7: `=IF(Bookings!D18="","",Bookings!D18)`

### Processing
- State: `visible`
- Used range: rows 1-13, cols 1-12
- Formula cells: 0
- Labels sample:
  - B1:PROCESSING
  - B4:Mositure: | D4:0.11
  - B6:Processing Station: | D6:GUNA TRADING COFFEE PROCESSING | I6:ሆራይዘን ቡና ማበጠሪያ
  - B9:Station Address: | D9:ADDIS ABABA - ETHIOPIA
  - B13:Move to booking& Processing

### Commercial Invoice
- State: `visible`
- Used range: rows 1-54, cols 1-13
- Formula cells: 27
- Labels sample:
  - G3:www.dhakaboracoffee.com
  - K5:DATE:-
  - K6:REF, NO.
  - B7:COMMERCIAL INVOICE
  - B10:SHIPPER
  - B11:APPLICANTS NAME
  - B12:REFERENCE | C12:SALES CONTRACT REF. NO | I12:DATED
  - B13:IF TERM OF PAYMENT
- Formula sample:
  - C10: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - C11: `='Contract-SI-LC'!K31`
  - E12: `=Contract!C5`
  - K12: `=Contract!C7`
  - C13: `='Contract-SI-LC'!K16`
  - C14: `='Bank & LC'!C4`
  - C15: `='Contract-SI-LC'!K17`
  - H15: `='Contract-SI-LC'!K24`

### Packing List
- State: `visible`
- Used range: rows 1-42, cols 1-12
- Formula cells: 51
- Labels sample:
  - I2:www.dhakaboracoffee.com
  - K4:DATE:
  - K5:REF, NO.
  - C7:PACKING LIST CERTIFICATE
  - A9:SHIPPER
  - A10:APPLICANTS NAME
  - A11:CONSIGNEE
  - A12:REFERENCE | B12:SALES CONTRACT REF. NO | I12:DATED
- Formula sample:
  - B9: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - B10: `='Contract-SI-LC'!K31`
  - B11: `='Contract-SI-LC'!K29`
  - E12: `=Contract!C5`
  - B13: `='Contract-SI-LC'!K17`
  - I13: `='Contract-SI-LC'!K24`
  - B14: `='Contract-SI-LC'!K20`
  - I14: `='Contract-SI-LC'!K20`

### SI
- State: `visible`
- Used range: rows 1-45, cols 1-16
- Formula cells: 45
- Labels sample:
  - L2:www.dhakaboracoffee.com
  - N5:DATE:
  - N6:REF. No:
  - F8:SHIPPING INSTRUCTION
  - D9:SHIPPING LINE: MAERSK SHIPPING LINE / TO: ORBIT FREIGHT LOGISTICS
  - D10:SHIPPER NAME   FULL ADDRESS IS REQUIRED NAME, TEL, EMAIL, FAX
  - D11:CONSIGNEE FULL ADDRESS IS REQUIRED NAME,TEL, EMAIL,FAX
  - D12:NOTIFY PARTY FULL ADDRESS IS REQUIRED NAME, TEL, EMAIL, FAX
- Formula sample:
  - E10: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - E11: `='Contract-SI-LC'!K29`
  - E12: `='Contract-SI-LC'!K30`
  - E13: `=IF('Contract-SI-LC'!K32="-"," ",'Contract-SI-LC'!K32)`
  - E17: `='Shipping Instruction'!F7`
  - E18: `="ETHIOPIAN COFFEE, UNWASHED ARABICA,"&'Contract-SI-LC'!K13&" GRADE "&'Contract-SI-LC'!K14&", CROP YEAR "&'Contract-SI-LC'!F37&", AS PER CONTRACT REF."&Contract!C5`
  - E19: `='Form Configuration'!D16`
  - E20: `=CONCATENATE(Contract!D18," BAGS ", "(",Contract!D34,"*20",")")`

### Certificate of Quality
- State: `visible`
- Used range: rows 1-42, cols 1-9
- Formula cells: 47
- Labels sample:
  - E2:www.dhakaboracoffee.com
  - E5:DATE:
  - E6:REF. NO:
  - D8:CERTIFICATE OF QUALITY
  - B11:MODE OF TRANSPORTATION:
  - B12:MOISTURE CONTENT:
  - B13:SHIPPER:
  - B14:NOTIFY:
- Formula sample:
  - B9: `=CONCATENATE("THIS IS A QUALITY CERTIFICATE IS FOR ",'Contract-SI-LC'!K28)`
  - C11: `=CONCATENATE(Bookings!C5,",","VESSEL ",Bookings!C6,", VOYAGE NO",Bookings!C7,", UNDER B/L NO", Bookings!B43, "WERE PACKED IN JUTE BAGS AS FOLLOWS:")`
  - C12: `=Processing!D4`
  - C13: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - C14: `='Contract-SI-LC'!K30`
  - C15: `='Contract-SI-LC'!K32`
  - C16: `='Contract-SI-LC'!K28`
  - C17: `='Form Configuration'!K7`

### Certificate of Weight
- State: `visible`
- Used range: rows 1-40, cols 1-10
- Formula cells: 85
- Labels sample:
  - G2:www.dhakaboracoffee.com
  - H5:DATE
  - H6:Ref No:
  - D8:CERTIFICATE OF WEIGHT
  - B9:SHIPPER:
  - B10:NOTIFY:
  - B11:2ND NOTIFY:
  - B12:Description of Goods:
- Formula sample:
  - C9: `=_xlfn.CONCAT('Form Configuration'!B1:D1," ",'Form Configuration'!B2:D2)`
  - C10: `='Contract-SI-LC'!K30`
  - C11: `='Contract-SI-LC'!K32`
  - C12: `='Contract-SI-LC'!K28`
  - C13: `=CONCATENATE(Contract!D26," KG")`
  - C14: `=CONCATENATE(Contract!H26," KG")`
  - C15: `='Contract-SI-LC'!F35`
  - C16: `='Form Configuration'!K7`

### WAY BILL
- State: `visible`
- Used range: rows 1-46, cols 1-17
- Formula cells: 19
- Labels sample:
  - K2:www.dhakaboracoffee.com
  - F7:WAY BILL
  - L9:DATE:
  - L10:REF. No:
  - B11:To:
  - B14:Truck No:
  - B15:Trailer No:
  - B16:Driver Name: | C16:ABEBE DEJENE
- Formula sample:
  - C11: `='Form Configuration'!E19`
  - C12: `=CONCATENATE('Form Configuration'!E21,"(",'Form Configuration'!E20,")")`
  - C14: `=INDEX(Staffing!B22:N31,MATCH('WAY BILL'!C16,Staffing!D22:D31,0),2)`
  - C15: `=INDEX(Staffing!B22:N31,MATCH('WAY BILL'!C16,Staffing!D22:D31,0)+1,2)`
  - C17: `=INDEX(Staffing!B22:N31,MATCH('WAY BILL'!C16,Staffing!D22:D31,0),4)`
  - C18: `=INDEX(Staffing!B22:N31,MATCH('WAY BILL'!C16,Staffing!D22:D31,0),5)`
  - C19: `='Contract-SI-LC'!K24`
  - B21: `=CONCATENATE("I ",C16," the undersigned_____________and that I have Received the Goods from Praxis International PLC and bind myself to covey them safe to Djibouti port.")`

### COCG
- State: `visible`
- Used range: rows 1-112, cols 1-17
- Formula cells: 12
- Labels sample:
  - Q2:Yes
  - Q3:No
  - C4:አስቻለው ብርሃኑ በቀለ
  - C5:ASCHALEW BERHANU BEKELE
  - C6:0952 50 50 50  Email:- aschalew@sador-et.com  12553
  - B8:Driver’s Name | G8:የምስክር ወረቀት ቁጥር
  - B9:Truck plate No | F9:Cert.No | G9:23
  - B10:Trailer No | F10:ቀን
- Formula sample:
  - C37: `='Contract-SI-LC'!K13`
  - F37: `='Contract-SI-LC'!K14`
  - B45: `=CONCATENATE(Contract!D18/Contract!D34," ",  Contract!D17)`
  - C45: `=CONCATENATE(Contract!H26/Contract!D34," KGS")`
  - D45: `=CONCATENATE(Contract!D26/Contract!D34," KGS")`
  - E45: `=CONCATENATE('Form Configuration'!B1,CHAR(10),"ETHIOPIA ARABICA COFFEE ",'Contract-SI-LC'!K13," GRADE ",Contract!D38,CHAR(10),"ICO NO- 010/1116/","00",COCG!G9,CHAR(10),"CERT NO-","00",COCG!G9,CHAR(10),"CROP YEAR-",'Contract-SI-LC'!F37,CHAR(10),"NET WEIFGHT - ",'Certificate of Weight'!F25," KG ",CHAR(10),"GROSS WEIGHT ",'Certificate of Weight'!G25," KG ",CHAR(10),"DESTINATION -", 'Contract-SI-LC'!K20)`
  - C63: `=IFERROR(IF(O65="Yes",INDEX(Staffing!B22:J31,MATCH(G9,Staffing!I22:I31,0),3),""),"")`
  - C64: `=IFERROR(IF(O65="Yes",IF(INDEX(Staffing!B22:J31,MATCH(G9,Staffing!I22:I31,0),1)="TRUCK",INDEX(Staffing!B22:J31,MATCH(G9,Staffing!I22:I31,0),2),""),""),"")`

### VGM
- State: `visible`
- Used range: rows 1-39, cols 1-11
- Formula cells: 76
- Labels sample:
  - C7:FM-MA-47(01)
  - C11:SOLAS Verified Gross Mass Declaration Form
  - C12:We hereby confirm the verified gross mass for the below containers as outlined below.
  - C13:Shipment Reference :
  - C14:Booking Number: | G14:Date of Declaration:10/06/2023
  - C15:Container No. | D15:Seal No.: | E15:Wt. Method (1 or 2) | F15:kg or lbs. | G15:Method
  - G16:Cargo and packing weight | H16:Container Tare wt. | I16:Total VGM
  - C27:Method 1- The container was weighed after it had been packed, only the total VGM to be entered. Method 2- All cargo and 
- Formula sample:
  - D13: `=Contract!C5`
  - D14: `=IF(Bookings!C4="","-",Bookings!C4)`
  - C17: `=Staffing!G22`
  - D17: `=Staffing!H22`
  - E17: `=IF(C17="","",1)`
  - F17: `=IF(C17="","","Kg")`
  - G17: `=IF(C17="","",CONCATENATE(Contract!$H$26/Contract!$D$34," Kg"))`
  - H17: `=IF(Staffing!J22="","",CONCATENATE(Staffing!J22," Kg"))`

### ICO
- State: `visible`
- Used range: rows 1-21, cols 1-6
- Formula cells: 6
- Labels sample:
  - B3:1    1   1    6
  - D5:0 1 0 | E5:0 1
  - D6:ETHIOPIA | F6:0    1    0
  - C7:0   4    0 | D7:27/06/2023
  - B9:DIRECT
  - D10:X
  - B12:010    1274    0015-0018                     CERT NO. 0015-0018 | F12:X
  - B13:X
- Formula sample:
  - B2: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2," Email: ",'Form Configuration'!H1," TEL:",'Form Configuration'!H2)`
  - B5: `='Contract-SI-LC'!K30`
  - B7: `='Contract-SI-LC'!K20`
  - C9: `=CONCATENATE(Bookings!C5," ",Bookings!C6," ",Bookings!C7)`
  - D12: `=Contract!D26`
  - C14: `=CONCATENATE('Contract-SI-LC'!K25," NEW JUTE ",Contract!D17," EACH OF ",Contract!D37, " GRADE ",Contract!D38, " CROP YEAR ",'Contract-SI-LC'!F37," AS PER CONTRACT REF NO. ",Contract!C5," ( ",'Contract-SI-LC'!K25," NEW JUTE BAGS, ",Contract!D28," LBS",")")`

### Cert Of Origin
- State: `visible`
- Used range: rows 1-48, cols 1-18
- Formula cells: 9
- Labels sample:
  - E13:KGS | G13:KGS
  - A46:26/06/2023
- Formula sample:
  - B3: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - B4: `='Contract-SI-LC'!K29`
  - B6: `=CONCATENATE("SHIPPED BY ",Bookings!C5," ",Bookings!C6," FROM ",'Contract-SI-LC'!K24," TO ",'Contract-SI-LC'!K20)`
  - A12: `='Contract-SI-LC'!F35`
  - B12: `=CONCATENATE(Contract!D18," JUTE BAGS")`
  - E12: `=Contract!H26`
  - G12: `=Contract!D26`
  - I12: `=CONCATENATE('Contract-SI-LC'!K28," ,ICO NO:",'Form Configuration'!A12,"/",Contract!F54,", CERT NO: ",Contract!F54," ,CROP YEAR:",'Contract-SI-LC'!F37 )`

### NON-GMO
- State: `visible`
- Used range: rows 1-37, cols 1-8
- Formula cells: 15
- Labels sample:
  - E3:www.dhakaboracoffee.com
  - F6:DATE:
  - F7:REF, NO:
  - C9:NON-GMO CERTIFICATE
  - B13:THE SHIPMENT WHICH IS TO BE SOLD UNDER THE FOLLOWING CONDITION IS FREE FROM GENETICALLY MODIFIED CONTENT.
  - B15:SHIPPER:
  - B16:NOTIFY:
  - B17:2ND NOTIFY:
- Formula sample:
  - C15: `=_xlfn.CONCAT('Form Configuration'!B1:D1,",",'Form Configuration'!B2:D2)`
  - C16: `='Contract-SI-LC'!K30`
  - C17: `='Contract-SI-LC'!K32`
  - C18: `='Contract-SI-LC'!K28`
  - C19: `=Contract!C5`
  - C20: `='Contract-SI-LC'!K17`
  - D22: `=CONCATENATE(Contract!D30," MTS")`
  - D23: `='Contract-SI-LC'!F35`
