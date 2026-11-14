# ERP screen जाँच: परिणाम और शेष काम

## 14 नवंबर 2026: इस environment में क्या चला

- Playwright + Chromium ने development frontend पर **62 mocked UI checks** पास किए: 47 static route renders (7 print routes सहित), एक inward form में item जोड़ना और बिना customer के validation, dispatch में description-only row की validation और initial status choices, desktop/mobile menu navigation, unknown route fallback, local icon font, तथा login tab/OTP loading behaviour।
- Synthetic उदाहरण के साथ challan, job card, VHT runsheet, certificate, invoice, dispatch और quotation print पर print button तथा PDF generation जाँचा; NC register पर खाली mock PDF भी जाँचा। यह content की accounting correctness, paper pagination या physical printer test नहीं है। Quotation के failed-load path को भी जाँचा।
- API responses synthetic थे; writes block थे। Frontend authentication development bypass से हुआ। इसलिए ये असली login, backend, data persistence या business workflow tests नहीं हैं। Route render का pass होना उस route के सभी buttons, data states, calculations या print layout की correctness का प्रमाण नहीं है।
- अलग से `scripts/training-screen-walk.cjs` ने 19 screens के screenshots लिये। इनसे बना [demo screen overview](media/erp-demo-screen-tour.mp4) silent है; यह real-time interaction recording या पूरी training नहीं है।
- [23-second /brag overview](../brag-output/brag.mp4) वास्तविक frontend screenshots और mocked data से बना है। GitHub `latent-spaces/brag` workflow और HyperFrames 0.9.46 का इस्तेमाल किया; `hyperframes check` में 0 errors और contrast 35/35 pass थे, साथ में composition-structure और लंबे static holds की warnings थीं। Music है, voiceover नहीं।
- [हिंदी narration वाला screen-based प्रशिक्षण](media/erp-training-beginners.mp4) लगभग 7:50 मिनट है। 28 slides के text, screenshot और highlight bounds programmatically जाँचे; contact sheet और कुछ render frames को visually inspect किया। कुछ zoom में फॉर्म के भाग कट रहे थे, जिन्हें सुधारकर मुख्य form और button दिखाए। वीडियो में अध्याय metadata और स्वतः अनुमानित timing वाले optional Hindi subtitles हैं; subtitles शब्द-स्तर पर जाँचे नहीं गए। MP4 का पूरा audio/video decode जाँचा। यह video-layout जाँच है, app के हर form और viewport का responsive overflow test नहीं। Screenshots mock हैं और लंबे pages/अगले form steps पूरी तरह नहीं दिखते।
- अलग [Hinglish narration वाला वीडियो](media/erp-training-hinglish.mp4) इन्हीं screenshots पर नया audio है। इसमें chapter metadata और स्वतः अनुमानित subtitles हैं; पूरा MP4 तथा audio-only MP3 decode हुआ और एक rendered frame देखा। यह database या business workflow की अतिरिक्त जाँच नहीं है।
- Frontend build चला, पर इस sandbox में सामान्य `npm ci` SheetJS CDN restriction से फेल था। अस्थायी रूप से locally xlsx 0.18.5 install कर build किया; repository की declared dependency/lockfile नहीं बदली। इसे normal locked-dependency build की पुष्टि न समझें।
- MySQL और Prisma engine नहीं मिलने के कारण वास्तविक backend E2E नहीं चला। `cd backend && npm run test:unit:workflow` में **25/25** tests पास हुए। Job-card और dispatch controller tests fake transactional database का उपयोग करते हैं; ये वास्तविक Prisma queries, MySQL locking, race conditions या authenticated API की पुष्टि नहीं करते।
- `npm audit --omit=dev` ने backend dependency tree में 6 advisories दिखाईं: `proxy-addr` critical, `body-parser` और `joi` high, `ip-address`, `nodemailer` और `qs` moderate। कोई dependency fix इस audit में लागू नहीं किया; versions, exploitability, compatibility और patched lockfile की अलग समीक्षा आवश्यक है।

## सुधार

- Google Fonts blocked होने पर material icon के नाम text की तरह दिखते थे और layout बिगड़ता था। Icon font अब app से आता है; bundled font license `frontend/src/assets/fonts/MATERIAL-SYMBOLS-LICENSE.txt` है। बाकी typography के लिए network न मिले तो system font fallback है।
- OTP भेजते समय Send button loading/disabled रहता है और तब login mode बदलना बंद है, ताकि duplicate request या गलत mode में response न पहुँचे।
- Quotation print में failed request पर हमेशा Loading रह जाता था; अब error और वापसी का link है, print दोबारा करने का button है, और unmount पर auto-print timer साफ़ होता है।
- Collapsed sidebar links तथा sign-out को screen readers के लिए स्पष्ट नाम दिए; challan print के सजावटी icons भी छिपाए।
- Screen walk अब unexpected redirect और app error boundary भी रिपोर्ट करता है।
- Selected inward lines से Job Card बनाने में duplicate/invalid IDs, missing lines, अलग-अलग challans और पहले से assigned/non-pending lines रोककर conditional claim transaction में किया। Concurrency का व्यवहार अभी MySQL पर साबित नहीं है।
- Linked dispatch की एक ही source line की repeated quantities जोड़ी जाती हैं; update और status change में serializable transaction और draft से भेजते समय दोबारा quantity जाँच है। General PUT भी वही status transition rules मानता है; नया dispatch DRAFT या SENT से शुरू हो सकता है। UI अब incomplete rows silently drop नहीं करता, linked source चुनना अनिवार्य बताता है और source challan बदलने पर पुराने source links हटाता है। Decimal(12,3) के अनुसार positive fractional quantity स्वीकार होती है; इस unit policy की business-owner से पुष्टि बाकी है।
- Cookie-authenticated writes की origin जाँच में substring match हटाकर exact origin तुलना की; bearer-token flow नहीं बदला। पूरी security audit या CORS setup की पुष्टि नहीं हुई है।
- Data-changing legacy backend tests/workflow script में explicit `ERP_ALLOW_DESTRUCTIVE_TESTS=1`, local API और local `_test`/`_e2e` database-name guard जोड़ा है। UI scripts के अलग guards हैं। Local hostname tunnel हो सकता है और API अलग DB से जुड़ी हो सकती है: isolation की जिम्मेदारी test चलाने वाले की है। पुराना backend workflow script cleanup नहीं करता।

## अभी क्या नहीं जाँचा गया

1. वास्तविक authentication/permissions, OTP email delivery, role-specific access, session expiry/logout।
2. सभी form fields, validation, edit/delete, filters, pagination, exports, error/retry, keyboard और responsiveness। केवल कुछ actions जाँचे गए हैं।
3. Real data के साथ inward → job card/inspection → planning/runsheet → certificate/rework → invoice → dispatch; billing/GST, concurrency, data integrity और backend authorization।
4. वास्तविक data के साथ job card, challan, invoice, certificate, runsheet, quote और dispatch print/PDF का content, pagination और physical printer output। Synthetic PDF generation इनकी correctness का विकल्प नहीं है।
5. Database backup/restore, security, accessibility, device/browser compatibility, Tally integration और load testing।
6. पूर्ण आवाज़ वाला hands-on training video, जिसमें असली isolated demo database पर प्रत्येक step और error path दिखे।
7. Business-owner समीक्षा: Job Card print खोलने पर missing due date के लिए चार दिन बाद की तारीख निकालकर API को save करने की कोशिश होती है। Print खोलने से यह बदलाव अपेक्षित है या नहीं, तथा permissions/failed save का व्यवहार, वास्तविक database पर जाँचना बाकी है। Invoice print button copy count register करने की कोशिश करता है; dialog cancel होने पर भी count व्यवहार की समीक्षा करें।
8. Invoice update में Tally/IRN lock transaction से पहले पढ़ा जाता है: concurrent Tally/IRN update और invoice edit के बीच संभावित race की जाँच व सुरक्षित समाधान बाकी है। Rejection, dispatch और invoice ordering तथा GST/rounding के business rules को वास्तविक database और accountant के साथ verify करना जरूरी है। Source audit को accounting या production readiness की मंजूरी न मानें।

## दोबारा चलाने का तरीका

1. `frontend` में सामान्य dependencies और Playwright Chromium install करें; Vite development server चलाएँ।
2. `cd frontend && npm run e2e -- screen-smoke` चलाएँ। यह suite API mock करता है और write requests रोकता है। Custom Chromium के लिए `E2E_CHROMIUM_PATH` दे सकते हैं।
3. वास्तविक data-changing tests **सिर्फ disposable test database** पर चलाएँ। `frontend/tests/README.md` पढ़ें; `test:ui:interact` को `UI_TEST_ALLOW_WRITES=1` चाहिए और यह records create/delete/clear करता है। Local hostname भी remote tunnel हो सकता है।
4. `e2e/tests/jobwork.spec.js` legacy data-writing test है: default में skip है, cleanup नहीं है, और उसे वास्तविक API authentication/data setup के लिए सुधार और सत्यापन चाहिए। `E2E_ALLOW_WRITES=1` देने से वह पूर्ण या सुरक्षित नहीं हो जाता।
5. Backend के non-DB checks के लिए `cd backend && npm ci --ignore-scripts && npm run test:unit:workflow`। पुराना `test:all` real-DB और legacy suites भी चलाने का प्रयास करता है, इसलिए यह safe unit-only command नहीं है।
6. Backend destructive tests चलाने से पहले independently verify करें कि process और API दोनों उसी disposable local MySQL DB पर हैं; फिर `DATABASE_URL` local MySQL URL रखें जिसका नाम `_test` या `_e2e` पर समाप्त हो, local `TEST_API`/`API_BASE_URL` रखें और `ERP_ALLOW_DESTRUCTIVE_TESTS=1` दें। Guard safety का प्रमाण नहीं है; कुछ legacy tests का authentication/setup और cleanup अभी अधूरा है।

कभी भी इस परीक्षण के लिए production या मूल्यवान local data का उपयोग न करें।
