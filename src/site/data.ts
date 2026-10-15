/* Content for the SIM-Lab Kenya site (ported from the static design). */
import os from "@/assets/site/ocean-shujaa.jpg";
import ost from "@/assets/site/ocean-title.svg";
import ostl from "@/assets/site/ocean-title-light.svg";
import logo from "@/assets/site/logo.jpeg";
import h1 from "@/assets/site/hero-1.jpeg";
import h2 from "@/assets/site/hero-2.jpeg";
import a1 from "@/assets/site/activity-1.jpeg";
import a2 from "@/assets/site/activity-2.jpeg";
import a3 from "@/assets/site/activity-3.jpeg";
import a4 from "@/assets/site/activity-4.jpeg";
import b from "@/assets/site/img-b.jpeg";
import d from "@/assets/site/img-d.jpeg";
import e from "@/assets/site/img-e.jpeg";
import g from "@/assets/site/img-g.jpeg";
import h from "@/assets/site/img-h.jpeg";
import k from "@/assets/site/img-k.jpeg";
import l from "@/assets/site/img-l.jpeg";
import m from "@/assets/site/img-m.jpeg";
import n from "@/assets/site/img-n.jpeg";

export const IMG: Record<string, string> = { os, ost, ostl, logo, h1, h2, a1, a2, a3, a4, b, d, e, g, h, k, l, m, n };

export const PHONE = "0702 129 911";
export const TEL = "tel:+254702129911";
export const EMAIL = "simlabkenya@gmail.com";
export const WEB = "https://simlabkenya.co.ke/";
export const wa = (t?: string) =>
  "https://wa.me/254702129911?text=" + encodeURIComponent(t || "Hello SIM-Lab, I would like to learn more about your programs.");

export const SOCIAL = [
  { icon: "fb", label: "Facebook", href: "https://www.facebook.com/A22labs/" },
  { icon: "ig", label: "Instagram", href: "https://www.instagram.com/simlabkenya/" },
  { icon: "tw", label: "X", href: "https://x.com/Simlabkenya" },
  { icon: "li", label: "LinkedIn", href: "https://www.linkedin.com/in/simlab-kenya-aa0a023a9/" },
  { icon: "yt", label: "YouTube", href: "https://www.youtube.com/@SIMLABKENYA" },
];

/* [path, label, flag] flag 1 = interactive dot, 2 = NEW badge */
export const NAV: [string, string, number?][] = [
  ["/", "Home"],
  ["/bench", "The Bench", 1],
  ["/about", "About"],
  ["/programs", "Programs"],
  ["/ocean-shujaa", "Ocean Shujaa", 2],
  ["/gallery", "Gallery"],
  ["/faq", "FAQ"],
  ["/contact", "Contact"],
];

export const PCOL=['#5dade2','#22a06b','#13a8c4','#2f7fd8','#2fa66a','#d9568f','#8a63d2','#f08a24'];
export const PICO=['flask','globe','atom','waves','leaf','pen','mic','game'];

export const PROGRAMS: [string, string, string, string[], string, string | null, string | null][] = [
 ['Chemistry','The Fusion of Chemistry in All Disciplines','Explore chemistry as applied in multiple subjects, projects, and products, including different phenomena. We help students understand how chemistry connects to their everyday lives and other scientific disciplines.',['Chemistry applications across subjects','Real-world chemical phenomena','Practical chemistry experiments','Cross-disciplinary connections'],'Red cabbage juice holds anthocyanins, pigments that are red in acid, purple near neutral and blue-green in base. The same family colours hydrangeas and ripe berries. One kitchen indicator links chemistry, biology and food science.','Run the pH flask','/bench#ph'],
 ['Environment','Climate Change & Environmental Awareness','Training on climate change solutions and renewable energy. Students learn environmental monitoring techniques for air, soil, and water quality, and develop practical solutions for environmental challenges.',['Climate change science and solutions','Renewable energy technologies','Environmental monitoring methods','Sustainable practices'],'Mombasa lies about 4° south of the equator, so the midday sun is close to overhead all year. That changes the best angle for a solar panel, and the answer is not the one in most textbooks written for higher latitudes.','Test the solar panel','/bench#sun'],
 ['Nanotechnology','Nanotechnology & Green Chemistry','Green synthesis of nanoparticles using local plants. Applications in water purification, catalysis, and solar energy. Students explore cutting-edge science with practical environmental applications.',['Nanotechnology basics','Green chemistry principles','Local plant applications','Environmental solutions'],'In green synthesis, polyphenols in a plant extract reduce silver ions to silver atoms. As particles of roughly 10 to 100 nm form, the clear solution turns yellow-brown because of how light interacts with the metal surface.','Zoom to the nanoscale','/bench#scale'],
 ['Blue economy','Blue Economy & Ocean Projects','Marine resource utilization for food, beauty, and packaging. Awareness programs on ocean conservation. Students learn to leverage ocean resources sustainably while protecting marine ecosystems.',['Marine resource utilization','Ocean conservation','Sustainable coastal practices','Blue economy innovations'],'Seaweed gives us agar and carrageenan, used in food and cosmetics and studied as packaging material. Mangrove soils lock away large amounts of carbon, which makes protecting them a climate decision too.','Acidify the ocean','/bench#ocean'],
 ['Phytochemistry','Traditional Medicine & Phytochemistry','Research on local medicinal plants. Value addition and publication of findings. Students explore the science behind traditional medicine and contribute to documented knowledge.',['Medicinal plant identification','Phytochemical analysis','Research methodology','Value addition processes'],'Plant extracts are screened for compound classes such as alkaloids, flavonoids, tannins and saponins using simple colour and foam tests. A screen shows what is present, not that it works as a medicine. That gap is where research begins.',null,null],
 ['Writing','Scientific Writing & Publications','Training on writing research papers and journal articles. Support in publishing and knowledge dissemination. Students develop essential scientific communication skills.',['Research paper structure','Scientific writing style','Journal submission process','Data presentation'],'Most papers follow IMRaD: Introduction, Methods, Results and Discussion. The Methods section is written so a stranger could repeat the experiment and check the result.',null,null],
 ['Forums','Multidisciplinary Talks & Innovation Forums','Networking platforms for scientists, innovators, and entrepreneurs. Showcasing community-driven innovations. We create spaces for knowledge exchange and collaboration.',['Guest speaker series','Student presentations','Innovation showcases','Networking events'],'A claim becomes science when someone could show it wrong. Presenting to people from other fields is the fastest test of whether your explanation holds up outside your own head.',null,null],
 ['Learning aids','Interactive Learning Aids','Engage with science through interactive games and visual aids like animations, making complex concepts fun and accessible. Explore hands-on tools that bring STEM to life.',['Interactive games','Visual learning aids','Animated science concepts','Gamified learning'],'Research on learning keeps finding that testing yourself beats re-reading. Games, quizzes and simulations work because they ask the learner to predict first and see the result second, as the experiments on this site do.','Open the bench','/bench']
];
export const GLOSS=[['Phytochemistry','The study of chemical compounds made by plants, such as alkaloids and flavonoids.'],['Green chemistry','Designing chemical processes that use safer materials and make less waste.'],['Nanoparticle','A particle between about 1 and 100 nanometres. A nanometre is one billionth of a metre.'],['Blue economy','Economic activity that uses ocean and coastal resources while keeping marine ecosystems healthy.'],['SDG 4','The UN Sustainable Development Goal on inclusive, equitable, quality education and lifelong learning for all.'],['pH','A scale from 0 to 14 for how acidic or basic a solution is. Each step is a tenfold change in hydrogen ions.']];
export const FAQ: [string, [string, string][]][] = [
 ['General Questions',[['What age groups do you cater to?','We work with primary schools, junior secondary and senior secondary schools, colleges, science clubs and other educational groups. Every session is customised to the learners\' age and learning level.'],['Where is SIM-Lab located?','SIM-Lab is located within the IOME001 Innovation Hub in Mombasa, Kenya. We also conduct school-based programs at various partner institutions across the region.'],['What should students bring?','Students should come in comfortable clothing. All lab coats, safety equipment, and materials are provided by SIM-Lab. We recommend bringing a notebook and pen for notes.'],['Are meals provided during programs?','For half-day programs, snacks and refreshments are provided. For full-day programs, we provide lunch and refreshments. Please inform us of any dietary restrictions during registration.']]],
 ['Registration & Payment',[['How much does Ocean Shujaa cost?','Fees depend on the group size and the level of the learners. Call 0702 129 911 or email simlabkenya@gmail.com and we will send you the current fees for your school or group.'],['How do I register my child?','You can register by calling 0702 129 911 or by email (simlabkenya@gmail.com). After registration, you\'ll receive payment instructions and program details.'],['What payment methods do you accept?','We accept M-Pesa (primary method for Kenyan payments), bank transfer, and cash payments at our office (by appointment). Payment instructions will be provided upon registration confirmation.'],['Are there group discounts available?','Yes! We offer group discounts for school registrations of 5 or more students. Early bird discounts may also be offered for early registration. Contact us to discuss scholarship applications or group pricing.'],['Is there a refund policy?','Yes. Full refund if canceled 14+ days before program start, 50% refund for 7-13 days notice, and no refund for less than 7 days. Exceptions may be made for emergencies, so contact us to discuss.']]],
 ['Programs & Activities',[['What programs do you offer?','We offer hands-on STEM learning, climate action and renewable energy workshops, nanotechnology and green chemistry, blue economy and ocean projects, traditional medicine research, scientific writing training, and multidisciplinary innovation forums.'],['Do you offer school-based programs?','Yes! We partner with schools to deliver STEM programs at their premises or at our facility. This includes regular workshops, holiday programs, teacher training, and science club support.'],['What makes SIM-Lab different from other programs?','SIM-Lab focuses on connecting classroom science to real-world applications through hands-on learning. We provide continuous mentorship beyond programs, focus on community-centered solutions, and offer access to innovation resources through our partnership with IOME001.']]],
 ['Partnership',[['Can schools partner with SIM-Lab?','Absolutely! School partnerships can include regular STEM workshops during term time, holiday program hosting, teacher training sessions, science club support, innovation project mentorship, and joint research initiatives.'],['What are the benefits of partnership?','Partners receive customized STEM programs for students, professional development for teachers, access to innovation resources and mentorship, reduced rates for programs, priority registration for events, long-term educational support, and certificate programs for students.'],['How do I become a partner?','Contact us via WhatsApp, phone, or email to discuss partnership opportunities. We\'ll work with you to create a customized partnership package that meets your institution\'s needs and goals.']]]
];
export const GAL=[['a1','Collaborative science session','Holiday Programs'],['e','Lab safety and best practices','Workshops'],['a2','Microplastics awareness presentation','Presentations'],['a4','Interactive whiteboard learning','Holiday Programs'],['g','SIM-Lab activity highlight','Workshops'],['d','Innovation in action','Presentations'],['b','Hands-on STEM education','Workshops'],['h','Exploring new concepts','Presentations'],['k','Student demonstration','Workshops'],['l','Learning through discovery','Holiday Programs'],['m','Science fair project','Presentations'],['n','Future scientists','Workshops']];
export const CATS=['All Photos','Holiday Programs','Workshops','Presentations'];

export const FR={0:'hex',1:'orb',2:'hex',3:'bio',4:'bio',5:'orb',6:'hex',7:'bio'};
export const MORPH={0:[2,13,17,21],1:[26,20,8,23],2:[1,6,24,15],3:[0,19,10,23],4:[22,7,28,2],5:[14,9,29,31],6:[12,27,5,8],7:[25,28,16,24]};
export const OS_DAYS=[
 {t:'Class Theory & Orientation',where:'Classroom',c:'#2f7fd8',f:'orb',icons:[23,28,18,3],d:'An introduction to the ocean and its ecosystems: ocean chemistry, pH, alkalinity, CO₂ absorption, conductivity, marine microorganisms, fish, mangroves, pollution and climate change. Plus laboratory safety, research ethics and a preview of the week.'},
 {t:'Sampling & Field Studies',where:'In the field',c:'#13a8c4',f:'bio',icons:[13,26,17,22],d:'Supervised field work: ocean water sampling and in-situ measurements of pH, temperature, conductivity, salinity, dissolved oxygen and turbidity, with fish and mangrove observations and sample collection.'},
 {t:'Laboratory Analysis I',where:'Laboratory',c:'#1d4e89',f:'hex',icons:[12,0,10,19],d:'Analysing the samples collected: water chemistry, microbiological analysis, microscopy and fish anatomy and parasite investigations.'},
 {t:'Laboratory Analysis II',where:'Laboratory',c:'#22a06b',f:'hex',icons:[22,2,21,7],d:'Specialised lab work: fish quality investigations, mangrove soil analysis, plant extraction and phytochemical screening, and selected mangrove honey analyses.'},
 {t:'Results, Interpretation & Reporting',where:'Presentations',c:'#f2a71b',f:'orb',icons:[23,14,8,25],d:'Students organise and analyse their findings, draw scientific conclusions, and prepare short reports, graphs, tables or presentations. The week ends with student presentations, reflection and Ocean Shujaa certificates.'}];
