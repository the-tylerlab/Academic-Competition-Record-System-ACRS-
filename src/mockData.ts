export const DEFAULT_STUDENTS = [
  { studentId: "10001", name: "นายสมศักดิ์ รักเรียน", grade: "ม.5", room: "1", program: "Normal", email: "somsak.r@school.ac.th" },
  { studentId: "10002", name: "นางสาวจิราพร ใจดี", grade: "ม.5", room: "1", program: "Normal", email: "jiraporn.j@school.ac.th" },
  { studentId: "10003", name: "นายปกรณ์ บุญชู", grade: "ม.5", room: "2", program: "Normal", email: "pakorn.b@school.ac.th" },
  { studentId: "10004", name: "นางสาววิภาดา ดีเลิศ", grade: "ม.5", room: "2", program: "Normal", email: "wiphada.d@school.ac.th" },
  { studentId: "10011", name: "Mr. Michael Taylor", grade: "ม.5", room: "11", program: "EP", email: "michael.t@school.ac.th" },
  { studentId: "10012", name: "นางสาวศิริพร ประเสริฐ", grade: "ม.5", room: "11", program: "EP", email: "siriporn.p@school.ac.th" },
  { studentId: "10013", name: "นายอัครพล ยอดเยี่ยม", grade: "ม.5", room: "11", program: "EP", email: "akarapol.y@school.ac.th" },
  { studentId: "10014", name: "Miss Sophia Anderson", grade: "ม.5", room: "12", program: "EP", email: "sophia.a@school.ac.th" },
  { studentId: "10005", name: "เด็กชายกิตติศักดิ์ มุ่งมั่น", grade: "ม.3", room: "1", program: "Normal", email: "kittisak.m@school.ac.th" },
  { studentId: "10015", name: "เด็กหญิงชาร์ลอตต์ วัตสัน", grade: "ม.3", room: "5", program: "EP", email: "charlotte.w@school.ac.th" }
];

export const MOCK_SOURCES = [
  {
    id: "src1",
    name: "ประกาศผลโอลิมปิกวิชาการ_2569.pdf (ไฟล์เอกสาร)",
    sourceType: "file",
    fileName: "ประกาศผลโอลิมปิกวิชาการ_2569_คณิต_เคมี.pdf",
    description: "ประกาศผลการคัดเลือก สอวน. ระดับภูมิภาค เป็นเอกสาร PDF มีรายชื่อนักเรียนและสังกัดโรงเรียนเดิมปะปนกัน",
    rawText: `สมาคมวิทยาศาสตร์แห่งประเทศไทยฯ
ประกาศผลการแข่งขันคัดเลือกโอลิมปิกวิชาการ ประจำปีการศึกษา 2569

สาขาวิชาคณิตศาสตร์ (Mathematics):
1. นายสมศักดิ์ รักเรียน (โรงเรียนสตรีวิทยาค่าย) - ผ่านเข้ารอบสอง
2. นายปกรณ์ บุญชู (โรงเรียนวิทยาศึกษา) - ผ่านเข้ารอบสอง

สาขาวิชาเคมี (Chemistry):
1. นางสาวศิริพร ประเสริฐ (ชั้น ม.5 แผนการเรียนภาษาอังกฤษ) - ผ่านเข้ารอบสอง
2. นายอัครพล ยอดเยี่ยม (ชั้น ม.5 EP) - ผ่านเข้ารอบสอง`,
    parsedStudents: [
      { name: "นายสมศักดิ์ รักเรียน", subject: "คณิตศาสตร์", award: "ผ่านเข้ารอบสอง" },
      { name: "นายปกรณ์ บุญชู", subject: "คณิตศาสตร์", award: "ผ่านเข้ารอบสอง" },
      { name: "นางสาวศิริพร ประเสริฐ", subject: "เคมี", award: "ผ่านเข้ารอบสอง" },
      { name: "นายอัครพล ยอดเยี่ยม", subject: "เคมี", award: "ผ่านเข้ารอบสอง" }
    ]
  },
  {
    id: "src2",
    name: "https://www.academics-association.or.th/results-speech-2026 (ลิงก์เว็บไซต์)",
    sourceType: "url",
    webUrl: "https://www.academics-association.or.th/results-speech-2026",
    description: "ลิงก์เว็บไซต์ทางการประกาศผู้ชนะเลิศสุนทรพจน์ภาษาอังกฤษ มีรายชื่อนักเรียนสังกัดปกติและ English Program",
    rawText: `WEB RESULTS: HIGH SCHOOL ENGLISH SPEECH CONTEST 2026

[EP GROUP RESULTS]
Gold Medal Award: Mr. Michael Taylor (ม.5/11 แผนก EP)
Silver Medal Award: Miss Sophia Anderson (ม.5/12 แผนก EP)

[NORMAL GROUP RESULTS]
Gold Medal Award: นางสาวจิราพร ใจดี (ม.5/1 แผนกปกติ)
Silver Medal Award: นายปกรณ์ บุญชู (ม.5/2 แผนกปกติ)`,
    parsedStudents: [
      { name: "Mr. Michael Taylor", subject: "สุนทรพจน์ภาษาอังกฤษ", award: "เหรียญทอง (EP)" },
      { name: "Miss Sophia Anderson", subject: "สุนทรพจน์ภาษาอังกฤษ", award: "เหรียญเงิน (EP)" },
      { name: "นางสาวจิราพร ใจดี", subject: "สุนทรพจน์ภาษาอังกฤษ", award: "เหรียญทอง (ปกติ)" },
      { name: "นายปกรณ์ บุญชู", subject: "สุนทรพจน์ภาษาอังกฤษ", award: "เหรียญเงิน (ปกติ)" }
    ]
  },
  {
    id: "src3",
    name: "ประกาศผู้มีสิทธิ์ชิงทุนการศึกษา_2569.jpg (ไฟล์รูปภาพ)",
    sourceType: "file",
    fileName: "ทุนการศึกษา_มปลาย_2569.jpg",
    description: "ภาพถ่ายใบประกาศมอบทุนการศึกษาสำหรับนักเรียน ม.ปลาย ประจำปีการศึกษา 2569",
    rawText: `สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
รายชื่อนักเรียนผู้ได้รับพิจารณาทุนการเรียนดีเด่น ประจำปี 2569

ระดับชั้น ม.5:
- นางสาววิภาดา ดีเลิศ (ผลการเรียนเฉลี่ย 4.00)
- เด็กชายกิตติศักดิ์ มุ่งมั่น (ผลการเรียนเฉลี่ย 3.95)
- เด็กหญิงชาร์ลอตต์ วัตสัน (ผลการเรียนเฉลี่ย 3.90)`,
    parsedStudents: [
      { name: "นางสาววิภาดา ดีเลิศ", subject: "ทุนเรียนดีเด่น", award: "ทุนระดับชั้น ม.5" },
      { name: "เด็กชายกิตติศักดิ์ มุ่งมั่น", subject: "ทุนเรียนดีเด่น", award: "ทุนระดับชั้น ม.3" },
      { name: "เด็กหญิงชาร์ลอตต์ วัตสัน", subject: "ทุนเรียนดีเด่น", award: "ทุนระดับชั้น ม.3" }
    ]
  }
];
