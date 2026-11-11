// Count visits to the published game only. Never include a quest, save or account identifier.
(() => {
  if(location.origin!=='https://pixel-research-lab.github.io' || !navigator.onLine) return;
  const measurement='G-K8XT7HM09Y';
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config',measurement,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
  gtag('event','page_view',{send_to:measurement,page_title:'픽셀 연구실',page_location:location.origin+location.pathname,page_referrer:''});
  const script=document.createElement('script');
  script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+measurement;
  document.head.append(script);
})();
