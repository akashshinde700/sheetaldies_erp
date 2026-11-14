# SVT ERP: शुरुआती उपयोगकर्ता गाइड

> यह गाइड source code देखकर तैयार की गई है। इस environment में database के साथ पूरा workflow चला कर इसकी पुष्टि नहीं हो सकी। अपनी टीम के स्वीकृत process, rates और tax नियमों से मिलान करें।
>
> [Hinglish आवाज़ वाला शुरुआती प्रशिक्षण](media/erp-training-hinglish.mp4), उसके [अध्याय और समय](ERP-VIDEO-CHAPTERS-HINGLISH.md), तथा [हिंदी आवाज़ वाला संस्करण](media/erp-training-beginners.mp4) उपलब्ध हैं। [छोटा /brag overview](../brag-output/brag.mp4) और [screen overview](media/erp-demo-screen-tour.mp4) भी असली frontend के Playwright screenshots दिखाते हैं। इन सभी में data mocked है; ये वास्तविक database पर पूरा step-by-step workflow test नहीं हैं।

## ERP क्या करता है?

यह system customer का माल आने से लेकर treatment, quality, billing और dispatch तक की जानकारी अलग-अलग modules में रखता है। बाएँ menu से module खोलें। सामान्य क्रम:

**Party / masters → Inward challan → Job card / inspection → Planning और VHT runsheet → Certificate → Invoice → Dispatch.**

यह business का सामान्य क्रम है; हर step अपने आप पूरा या एक-दूसरे पर अनिवार्य रूप से निर्भर हो, ऐसा न मानें। Pending List से रुका हुआ काम ढूँढें।

## शुरू करने से पहले

1. Admin से अपना account और सही role लें। Password किसी से साझा न करें। Password Login में email और password डालकर **Sign In** करें। OTP Login में email डालकर **Send OTP** करें और मिला हुआ OTP डालें; OTP delivery के लिए server पर email setup आवश्यक है।
2. Dashboard और बाएँ menu को देखें। कुछ menu role के अनुसार नहीं दिखेंगे: party/production masters सामान्यतः Manager या Admin के लिए हैं; Users और Audit Logs Admin के लिए हैं। अनुमति न मिले तो administrator से बात करें।
3. Manager से **Parties**, **Processes**, **Items**, **Machines**, **Party Rates**, **HT Specs**, **Temp Cycle Graphs** और **Invoice Series** की जानकारी जाँचने को कहें। Customer तथा वास्तविक processor/vendor के नाम और rate सही होने चाहिए। Company और tax details को भी independently verify करें।

## रोज़ का मुख्य काम

### 1. Inwards: माल प्राप्त करें

- **Inwards** खोलें और नई inward entry पर जाएँ (`/jobwork/inward-entry`)। Customer, processor, challan/date और parts की जानकारी दर्ज करें। प्रत्येक item में part/material, quantity, weight, process और rate जैसी लागू जानकारी जाँचें।
- **Create Inward** दबाने पर system challan detail खोलता है। दर्ज किए गए नंबर को नोट करें। गलती या error message हो तो बिना जाँच दोबारा submit न करें; पहले register में देखें कि challan बन तो नहीं गया।
- Processor उपलब्ध नहीं है तो master data और role की जाँच कराएँ; system `No processor found` दिखा सकता है।

### 2. Job card और inspection

- Challan detail में **Pending Items — Select to Create Job Card** के अंदर संबंधित items चुनें; **Create Job Card** दबाएँ। कम से कम एक item चुनना ज़रूरी है। Related Job Cards में परिणाम जाँचें।
- **Job Cards** में card खोलें; part, quantity, treatment और customer details की पुष्टि करें। उपलब्ध inspection screen में आने वाले माल की जाँच दर्ज करें। Job card और challan का नंबर आपस में मिलाएँ।

### 3. Planning, treatment और energy

- **Daily Planning** में दिन का production/furnace plan देखें। **VHT Runsheet** में संबंधित job और cycle की जानकारी दर्ज/जाँचें। वास्तविक furnace readings, समय और temperature plant record से मिलाएँ।
- जहाँ लागू हो **Tempering Plan** और **Energy Log** उपयोग करें। ये manager-level pages हैं। डेटा वास्तविक मशीन रिकॉर्ड के आधार पर ही भरें।

### 4. Quality

- **Certificates** से संबंधित test certificate बनाएँ या खोलें। Job card detail पर Certificate link भी उपलब्ध है। Results और part identification को जारी/print करने से पहले जाँचें।
- समस्या होने पर लागू जानकारी **Rework Data** और **NC Register** में दर्ज/जाँचें। Rework होने का अर्थ यह नहीं कि कोई certificate अपने आप ठीक हो गया; जिम्मेदार quality व्यक्ति से पुष्टि लें।

### 5. Invoice और dispatch

- **Invoices** में नया invoice या मौजूदा invoice खोलें। Customer, linked jobs, weight, rate, taxable value, GST और total की जाँच करें। Print या export से पहले accountant से पुष्टि करें। वास्तविक GST या Tally posting की सफलता सिर्फ screen देखकर न मानें।
- **Dispatch** में dispatch challan और delivery details जाँचें; customer, items और quantity को invoice/physical material से मिलाएँ।

## दूसरे उपयोगी modules

- **Pending List**: workflow में रुके items देखें और जिम्मेदार टीम से follow-up करें।
- **Furnace Utilisation, Monthly Idle Time, Plant Losses**: periodic furnace/plant reports।
- **Customer Quotes**: customer quotation बनाएँ या देखें।
- **Inventory**: stock देखें। **Analytics**: business overview/reports देखें।
- **Users / Audit Logs**: Admin द्वारा access और activity review।

## सावधानियाँ

- Delete, status change, invoice और print को वास्तविक डेटा पर करने से पहले अधिकार और प्रभाव समझें। Demo/testing के लिए अलग database रखें।
- Screen पर empty list होने का मतलब जरूरी नहीं कि काम पूरा है; filter, network और access जाँचें। Save/error संदेश और बाद में record की पुष्टि करें।
- API, database, permission, calculation, print और Tally के असली परिणाम इस गाइड में प्रमाणित नहीं हैं।

## इस गाइड और video के लिए शेष verification

पूरी training video में एक isolated demo database पर वास्तविक login, masters, inward, selected items से job card, inspection, planning, runsheet, certificate, invoice, dispatch, print और error/permission paths को record व verify करना होगा। पहले customer और processor के वास्तविक business roles की owner से पुष्टि करें। इस repository में repeatable screen-tour script `scripts/training-screen-walk.cjs` है; यह mocked/read-only है, business E2E का विकल्प नहीं। विस्तृत coverage और बचे हुए काम के लिए [testing report](ERP-TEST-REPORT-HI.md) देखें।
