(function (global) {
  function formatINR(n) {
    n = Math.round(Number(n) || 0);
    return "₹" + n.toLocaleString("en-IN");
  }

  function pct(n) {
    return Math.round(n * 100);
  }

  var NARRATORS = {
    en: function (a) {
      return { message: a.message, suggestedAction: a.suggestedAction };
    },

    hi: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var curExp = formatINR(m.currentExpenses);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var month = m.monthName || "";
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = month + " में फसल/अधिशेष आय के कारण आय बढ़कर " + curInc + " हो गई। पिछले मंदी के महीनों में कुल " + accum + " की किश्त राहत दी गई थी। इस चक्र में अनुशंसित भुगतान " + rec + " (" + base + " मूल ईएमआई + " + catchUp + " पुरानी राहत वसूली) है।";
        suggestedAction = "कुल अनुशंसित राशि " + rec + " (" + base + " मूल + " + catchUp + " पुरानी राहत वसूली) वसूल करें। किसान बिना किसी तनाव के पुरानी बकाया राहत चुका रहा है।";
      } else if (status === "Stable") {
        message = month + " में आय " + curInc + " है, जो सामान्य सीमा (औसत " + avgInc + ") के भीतर है। " + curExp + " का खर्च नियमित है। " + base + " की मूल ईएमआई उपयुक्त है।";
        suggestedAction = "इस चक्र में निर्धारित संग्रह जारी रखें। किसी हस्तक्षेप की आवश्यकता नहीं है।";
      } else if (status.indexOf("Seasonal") === 0) {
        message = month + " में आय घटकर " + curInc + " हो गई — औसत " + avgInc + " से " + drop + "% कम। यह तंगी दिखती, लेकिन " + farm + "% खर्च खेती/निवेश (बीज, उर्वरक, श्रम) में है। यह मौसमी निवेश मंदी है। अगली फसल तक अनुशंसित किश्त " + rec + " है।";
        suggestedAction = "21 दिनों के लिए मुख्य संग्रह रोकें। फसल तक माइक्रोपल्स साप्ताहिक राशि का अनुरोध करें।";
      } else if (status === "Critical") {
        message = "आय " + m.consecutiveDips + " लगातार महीनों से मौसमी स्तर से नीचे रही है (अब " + curInc + " बनाम औसत " + avgInc + ")। खेती खर्च केवल " + farm + "% है, इसलिए यह बुवाई चक्र नहीं है। यह वास्तविक वित्तीय तनाव है। पूरी ईएमआई " + base + " वसूलने से डिफॉल्ट का जोखिम है।";
        suggestedAction = "7 दिनों के भीतर औपचारिक पुनर्गठन वार्ता खोलें। मियाद विस्तार या फसल-संबद्ध वसूली की पेशकश करें।";
      } else {
        message = "आय घटकर " + curInc + " हो गई, जो औसत (" + avgInc + ") से " + drop + "% कम है, बिना किसी निवेश संकेत के — खेती खर्च केवल " + farm + "% है। इसे अल्पकालिक तंगी मानें। ईएमआई इस चक्र के लिए घटाकर " + rec + " की गई है।";
        suggestedAction = "प्रारंभिक हस्तक्षेप समीक्षा शुरू करें। दो चक्रों के लिए कम ईएमआई स्वीकृत करें।";
      }

      return { message: message, suggestedAction: suggestedAction };
    },

    mr: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var curExp = formatINR(m.currentExpenses);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var month = m.monthName || "";
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = month + " मध्ये पिकाच्या भरघोस उत्पन्नामुळे उत्पन्न वाढून " + curInc + " झाले. मागील मंदीच्या महिन्यात " + accum + " ची सूट दिली होती. या चक्रात शिफारस केलेली रक्कम " + rec + " (" + base + " मूळ ईएमआय + " + catchUp + " जुनी सूट वसुली) आहे.";
        suggestedAction = "एकूण शिफारस केलेली रक्कम " + rec + " (" + base + " मूळ + " + catchUp + " जुनी सूट वसुली) जमा करा. शेतकरी विनाताण जुनी सूट परत फेडत आहे.";
      } else if (status === "Stable") {
        message = month + " मध्ये उत्पन्न " + curInc + " आहे, जे नेहमीच्या श्रेणीत (सरासरी " + avgInc + ") आहे. " + curExp + " चा खर्च नियमित आहे. " + base + " ची मूळ ईएमआय योग्य आहे.";
        suggestedAction = "या चक्रात ठरवलेली वसुली सुरू ठेवा. हस्तक्षेपाची गरज नाही.";
      } else if (status.indexOf("Seasonal") === 0) {
        message = month + " मध्ये उत्पन्न घटकर " + curInc + " झाले — सरासरी " + avgInc + " पेक्षा " + drop + "% कमी. खर्चाच्या " + farm + "% रक्कम शेती गुंतवणुकीवर आहे. ही हंगामी मंदी आहे. शिफारस केलेला हप्ता " + rec + " आहे.";
        suggestedAction = "21 दिवस मुख्य वसुली थांबवा. कापणीपर्यंत मायक्रोपल्स साप्ताहिक रक्कम मागा.";
      } else if (status === "Critical") {
        message = "उत्पन्न सलग " + m.consecutiveDips + " महिने सत्रापेक्षा कमी राहिले आहे (" + curInc + " वि सरासरी " + avgInc + "). शेती खर्च फक्त " + farm + "% आहे. हा खरा आर्थिक तणाव आहे. पूर्ण ईएमआय " + base + " मागितल्यास डिफॉल्टचा धोका आहे.";
        suggestedAction = "7 दिवसांत पुनर्रचना चर्चा सुरू करा. मुदत वाढ किंवा कापणीशी जोडलेली वसुली द्या.";
      } else {
        message = "उत्पन्न घटकर " + curInc + " झाले, सरासरीपेक्षा (" + avgInc + ") " + drop + "% कमी. शेती खर्च फक्त " + farm + "% आहे. हा अल्पकालीन ताण माना. हप्ता या चक्रासाठी " + rec + " केला आहे.";
        suggestedAction = "सुरवातीचा हस्तक्षेप सुरू करा. दोन चक्रांसाठी कमी ईएमआय मंजूर करा.";
      }

      return { message: message, suggestedAction: suggestedAction };
    },

    mwr: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = "इण म्हीने फसल री बंपर कमाई सू आय बधर " + curInc + " हुगी। पाछला मंदी रा म्हीनां मांय कुल " + accum + " री छूट दीवी ही। इण म्हीने री किश्त " + rec + " (" + base + " मूल + " + catchUp + " पाछली छूट री भरपाई) है।";
        suggestedAction = "कुल रकम " + rec + " (" + base + " मूल + " + catchUp + " पाछली छूट वसूली) लेवो। ओ किसान बिना तंगी पाछली छूट चुकावे है।";
      } else if (status === "Stable") {
        message = "कमाई " + curInc + " है, जकी आम कमाई (" + avgInc + ") रे बराबर है। मूळ किश्त " + base + " सही है।";
        suggestedAction = "चालू किश्त री वसूली जारी रखो।";
      } else if (status.indexOf("Seasonal") === 0) {
        message = "कमाई घटर " + curInc + " हुगी (" + drop + "% कम)। खरच रो " + farm + "% खेती (बीज, खाद) मांय गयो है। ओ फसली खरच है। अनुशंसित किश्त " + rec + " है।";
        suggestedAction = "21 दिनां ताई वसूली रोको अर हफ्तावारी किश्त लेवो।";
      } else if (status === "Critical") {
        message = "कमाई सलग " + m.consecutiveDips + " म्हीनां सू कम है (" + curInc + " बनाम " + avgInc + ")। खरच मांय खेती रो खरच सिर्फ " + farm + "% है। भारी तंगी है।";
        suggestedAction = "7 दिनां मांय पुनर्गठन री बात करो अर मियाद बढावो।";
      } else {
        message = "कमाई घटर " + curInc + " हुगी। खेती खरच सिर्फ " + farm + "% है। इण म्हीने किश्त घठार " + rec + " करी है।";
        suggestedAction = "कम किश्त मंजूर करो अर नजर रखो।";
      }

      return { message: message, suggestedAction: suggestedAction };
    },

    ta: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = "அறுவடை வருவாய் காரணமாக வருமானம் " + curInc + " ஆக அதிகரித்தது. முந்தைய மாதங்களில் " + accum + " நிவாரணம் வழங்கப்பட்டது. இந்த சுழற்சியில் பரிந்துரைக்கப்பட்ட தொகை " + rec + " (" + base + " அடிப்படை + " + catchUp + " பழைய நிவாரண மீட்பு).";
        suggestedAction = "மொத்த பரிந்துரைக்கப்பட்ட தொகையான " + rec + " (" + base + " அடிப்படை + " + catchUp + " நிவாரண மீட்பு) வசூலிக்கவும்.";
      } else if (status === "Stable") {
        message = "வருமானம் " + curInc + " ஆக உள்ளது, சராசரி (" + avgInc + ") வரம்பிற்குள் உள்ளது. அடிப்படை EMI " + base + " பொருத்தமானது.";
        suggestedAction = "வழக்கமான வசூலைத் தொடரவும்.";
      } else if (status.indexOf("Seasonal") === 0) {
        message = "வருமானம் " + curInc + " ஆக குறைந்தது (" + drop + "% குறைவு). செலவில் " + farm + "% விவசாய முதலீடு. இது பருவகால வீழ்ச்சி. பரிந்துரைக்கப்பட்ட தவணை " + rec + ".";
        suggestedAction = "21 நாட்களுக்கு முக்கிய வசூலை நிறுத்தவும். வாராந்திர தவணையை வசூலிக்கவும்.";
      } else if (status === "Critical") {
        message = "வருமானம் தொடர்ந்து " + m.consecutiveDips + " மாதங்களாக குறைந்துள்ளது (" + curInc + " vs " + avgInc + "). விவசாய செலவு " + farm + "% மட்டுமே. இது தீவிர நிதி நெருக்கடி.";
        suggestedAction = "7 நாட்களுக்குள் சீரமைப்பு பேச்சுவார்த்தையைத் தொடங்கவும்.";
      } else {
        message = "வருமானம் " + curInc + " ஆக குறைந்தது. விவசாய செலவு " + farm + "% மட்டுமே. தவணை " + rec + " ஆக குறைக்கப்பட்டுள்ளது.";
        suggestedAction = "குறைக்கப்பட்ட தவணையை இரண்டு சுழற்சிகளுக்கு ஒப்புக்கொள்ளவும்.";
      }

      return { message: message, suggestedAction: suggestedAction };
    },

    te: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = "పంట రాబడి వల్ల ఆదాయం " + curInc + " కి పెరిగింది. గత నెలల్లో " + accum + " ఉపశమనం అందించబడింది. ఈ చక్రంలో సిఫార్సు చేసిన చెల్లింపు " + rec + " (" + base + " మూల + " + catchUp + " పాత ఉపశమన రికవరీ).";
        suggestedAction = "మొత్తం సిఫార్సు చేసిన " + rec + " (" + base + " మూల + " + catchUp + " పాత ఉపశమన రికవరీ) వసూలు చేయండి.";
      } else if (status === "Stable") {
        message = "ఆదాయం " + curInc + " గా ఉంది, సాధారణ పరిధి (" + avgInc + ") లోనే ఉంది. మూల EMI " + base + " సరిపోతుంది.";
        suggestedAction = "షెడ్యూల్ చేసిన వసూలును కొనసాగించండి.";
      } else if (status.indexOf("Seasonal") === 0) {
        message = "ఆదాయం " + curInc + " కి తగ్గింది (" + drop + "% తగ్గుదల). ఖర్చులలో " + farm + "% వ్యవసాయ పెట్టుబడి. ఇది సీజనల్ తగ్గుదల. సిఫార్సు చేసిన EMI " + rec + ".";
        suggestedAction = "21 రోజులు ప్రధాన వసూలును నిలిపివేయండి. వారపు వాయిదాలను తీసుకోండి.";
      } else if (status === "Critical") {
        message = "ఆదాయం వరుసగా " + m.consecutiveDips + " నెలలుగా తగ్గింది (" + curInc + " vs " + avgInc + "). వ్యవసాయ ఖర్చు " + farm + "% మాత్రమే. ఇది తీవ్ర ఆర్థిక ఒత్తిడి.";
        suggestedAction = "7 రోజుల్లో పునర్నిర్మాణ చర్చలు ప్రారంభించండి.";
      } else {
        message = "ఆదాయం " + curInc + " కి తగ్గింది. వ్యవసాయ ఖర్చు " + farm + "% మాత్రమే. ఈ చక్రానికి EMI " + rec + " కి తగ్గించబడింది.";
        suggestedAction = "రెండు చక్రాలకు తగ్గించిన EMIని ఆమోదించండి.";
      }

      return { message: message, suggestedAction: suggestedAction };
    },

    bn: function (a) {
      var m = a.metrics || {};
      var status = a.status || "";
      var rec = formatINR(a.recommendedEMI);
      var base = formatINR(a.baseEMI || m.baseEMI || a.recommendedEMI);
      var curInc = formatINR(m.currentIncome);
      var avgInc = formatINR(m.avgIncome);
      var drop = pct(m.dropPct || 0);
      var farm = pct(m.farmingShare || 0);
      var catchUp = formatINR(m.catchUpAmount || 0);
      var accum = formatINR(m.accumulatedRelief || 0);

      var message = "";
      var suggestedAction = "";

      if (status.indexOf("Surplus") >= 0) {
        message = "ফসল কাটার পর আয় বেড়ে " + curInc + " হয়েছে। আগের মন্দার মাসে " + accum + " টাকা ছাড় দেওয়া হয়েছিল। এই চক্রে সুপারিশকৃত কিস্তি " + rec + " (" + base + " মূল + " + catchUp + " আগের ছাড় পুনরুদ্ধার)।";
        suggestedAction = "মোট সুপারিশকৃত " + rec + " (" + base + " মূল + " + catchUp + " আগের ছাড় পুনরুদ্ধার) আদায় করুন।";
      } else if (status === "Stable") {
        message = "আয় " + curInc + ", যা স্বাভাবিক সীমার (" + avgInc + ") মধ্যে। মূল ইএমআই " + base + " উপযুক্ত।";
        suggestedAction = "নির্ধারিত আদায় চালু রাখুন।";
      } else if (status.indexOf("Seasonal") === 0) {
        message = "আয় কমে " + curInc + " হয়েছে (" + drop + "% হ্রাস)। ব্যয়ের " + farm + "% কৃষি বিনিয়োগ। এটি ঋতুভিত্তিক হ্রাস। সুপারিশকৃত কিস্তি " + rec + "।";
        suggestedAction = "২১ দিনের জন্য মূল আদায় স্থগিত রাখুন। সাপ্তাহিক কিস্তি বিবেচনা করুন।";
      } else if (status === "Critical") {
        message = "আয় টানা " + m.consecutiveDips + " মাস ধরে কম (" + curInc + " বনাম " + avgInc + ")। কৃষি ব্যয় মাত্র " + farm + "%। এটি প্রকৃত আর্থিক চাপ।";
        suggestedAction = "৭ দিনের মধ্যে আনুষ্ঠানিক পুনর্গঠন আলোচনা শুরু করুন।";
      } else {
        message = "আয় কমে " + curInc + " হয়েছে। কৃষি ব্যয় মাত্র " + farm + "%। ইএমআই কমিয়ে " + rec + " করা হয়েছে।";
        suggestedAction = "দুই চক্রের জন্য হ্রাসকৃত ইএমআই অনুমোদন করুন।";
      }

      return { message: message, suggestedAction: suggestedAction };
    }
  };

  function localizeAnalysis(analysis, lang) {
    if (!analysis) return analysis;
    var fn = NARRATORS[lang] || NARRATORS.en;
    var localized = fn(analysis);
    return Object.assign({}, analysis, localized);
  }

  global.EquiFlowI18nEngine = { localizeAnalysis: localizeAnalysis };
})(window);
