import React, { useState, useEffect, useRef } from "react";
import ReactSelect from "react-select";
import API from "./api";
import {
  MapPin, Plus, X, Check, ChevronLeft, ChevronRight, Footprints,
  Users, Home as HomeIcon, Wheat, PawPrint, Camera,
} from "lucide-react";
import dnpLogo from "./assets/DNP60x60.png";
import {
  PROVINCES,
  districtsOfProvince, subdistrictsOfDistrict,
  findProvinceByName, findDistrictByName, findSubdistrictByName,
} from "./thai-address-data";
// import forestData from "./forest-data.json";
// import propData from "./prop-items.json";
// import cropData from "./crop-species.json";

/* ---------------- static data ---------------- */

const STEPS = [
  { n: 1, label: "ส่วนที่ 1", name: "หน่วยงานที่รายงาน" },
  { n: 2, label: "ส่วนที่ 2", name: "หน่วยงานที่สนธิกำลัง" },
  { n: 3, label: "ส่วนที่ 3", name: "สาเหตุออกปฏิบัติงาน" },
  { n: 4, label: "ส่วนที่ 4", name: "ตำแหน่งที่ปฏิบัติงาน" },
  { n: 5, label: "ส่วนที่ 5", name: "รายละเอียดช้างป่า" },
  { n: 6, label: "ส่วนที่ 6", name: "รายงานความเสียหาย" },
  { n: 7, label: "ส่วนที่ 7", name: "ผู้บันทึก" },
];

// const OFFICES = forestData.offices.map((o) => o.name);

// const forestAreas = {};
// const AREA_TO_SETS = {};
// const JOINT_SUGGEST = {};
// for (const a of forestData.areas) {
//   const fullName = a.type + a.name;
//   (forestAreas[a.office] ||= []).push(fullName);
//   if (a.sets) AREA_TO_SETS[fullName] = a.sets.split(",");
//   if (a.type) (JOINT_SUGGEST[a.type] ||= []).push(fullName);
// }
// for (const o of OFFICES) forestAreas[o] ||= [];

const JOINT_TYPES = [
  "อุทยานแห่งชาติ",
  "เขตรักษาพันธุ์สัตว์ป่า",
  "เขตห้ามล่าสัตว์ป่า",
  "สวนพฤกษศาสตร์ / สวนรุกขชาติ",
  "หน่วยงานราชการอื่น",
  "องค์กรปกครองส่วนท้องถิ่น",
  "เครือข่าย",
  "อื่นๆ",
];

const ACTIVITIES = [
  "ออกปฏิบัติงานตามแผนเฝ้าระวังผลักดันและติดตามสัตว์ป่าตามปกติ",
  "ได้รับแจ้งเหตุจากประชาชน หรือเครือข่าย หรือผู้นำชุมชน หรือเจ้าหน้าที่หน่วยอื่น ๆ",
  "ได้รับแจ้งผ่านระบบและอุปกรณ์ต่าง ๆ",
  "สายด่วนพิทักษ์ป่า 1362",
  "การลาดตระเวนเชิงคุณภาพ (SMART Patrol)",
  "อื่นๆ",
];

const PREFIXES = ["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง"];
const RECORDER_PREFIXES = ["นาย", "นาง", "นางสาว"];
// const PROP_SUGGEST = propData.items.flatMap((i) => [i.name, ...(i.aliases || [])]);
// const PROP_ALIAS_TO_CANONICAL = {};
// for (const i of propData.items) {
//   for (const a of i.aliases || []) PROP_ALIAS_TO_CANONICAL[a] = i.name;
// }
// const CROP_SPECIES_BY_TYPE = {};
// for (const s of cropData.species) {
//   (CROP_SPECIES_BY_TYPE[s.category] ||= []).push(s.name);
// }
// const CROP_SPECIES_BY_TYPE = {
//   "พืชไร่/พืชสวน": ["ข้าว", "ข้าวโพด", "มันสำปะหลัง", "อ้อย", "สับปะรด", "กล้วย", "ว่านหางจระเข้", "พริกไทย"],
//   "ไม้ผล": ["ทุเรียน", "ลำไย", "เงาะ", "มังคุด", "ลิ้นจี่", "ลองกอง/ลางสาด", "มะม่วง", "ขนุน", "มะพร้าว", "หมาก", "แก้วมังกร", "มะละกอ", "ส้มโอ"],
//   "ไม้ยืนต้น": ["ยางพารา", "ปาล์มน้ำมัน", "ยูคาลิปตัส", "ไผ่"],
// };

let uidCounter = 0;
const uid = (p) => `${p}${++uidCounter}`;

function formatPhoneTH(digits) {
  const d = digits.replace(/[^0-9]/g, "").slice(0, 10);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 10);
  return [p1, p2, p3].filter(Boolean).join(" ");
}

const initialData = {
  // ---------- STEP 1 ----------
  office: "", 
  area: "", 
  setName: "", 
  date: "", 
  time: "",
  // ---------- STEP 2 ----------
  jointType: JOINT_TYPES[0], 
  jointNameInput: "", 
  jointUnits: [],
  // ---------- STEP 3 ----------
  activityId: "", 
  activityOther: "",
  // ---------- STEP 4 ----------
  method: "gps", 
  province: "", 
  district: "", 
  subdistrict: "", 
  utmZone: "", 
  coord1: "", 
  coord2: "",
  geo: null, 
  geoHint: "ต้องอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่งของอุปกรณ์",
  //  ---------- STEP 5 ----------
  observation: {
  // รูปแบบการพบ
    seeForm: "เห็นตัว",
  // ใช้เฉพาะ React ไม่ส่งเข้า Database
   encounterType: "single",
  // ข้อมูลฝูง
    herd: {
      herdName: "",
      countActual: "",
      countEstimate: "",
      remark: "", 
      photos: []
      },
  // ช้างที่ระบุตัวได้
    elephants: [],
    photos:[]
  },
  // ---------- STEP 6 ----------
  hasDamage: "", 
  skip: { people: false, property: false, crop: false, elephant: false },
  people: [], properties: [], crops: [], elephantDamages: [],
  // ---------- STEP 7 ----------
  recorderPrefix: "นาย", recorderFirst: "", recorderLast: "", recorderPos: "", recorderOrg: "", recorderPhone: "",
};

/* ---------------- small building blocks ---------------- */

/** Tracks an element's own rendered width via ResizeObserver — reacts to the
 * space it actually has, not the browser viewport (fixes Tailwind's sm:/md:
 * mismatching when the element sits in a container narrower than the page). */
function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function StepCircle({ done, active, size = 34 }) {
  return (
    <span
      className={
        "rounded-full flex items-center justify-center shrink-0 border-2 transition-colors " +
        (done
          ? "bg-emerald-500 border-emerald-500"
          : active
          ? "bg-amber-600 border-amber-600 ring-4 ring-amber-600/25"
          : "bg-white border-stone-300")
      }
      style={{ width: size, height: size }}
    >
      {done ? (
        <Check size={16} className="text-white" strokeWidth={3} />
      ) : (
        <Footprints size={14} className={active ? "text-white" : "text-stone-300"} />
      )}
    </span>
  );
}

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-amber-600 bg-transparent text-amber-600 text-[10px] font-bold leading-none hover:bg-amber-50 accent-amber-600"
        aria-label="ข้อมูลเพิ่มเติม"
      >
        i
      </button>
      {open && (
        <span
          className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 text-xs font-normal text-stone-600 bg-white border border-stone-200 rounded-lg shadow-lg p-2.5 leading-relaxed"
          style={{ maxWidth: "calc(100vw - 2rem)" }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function Field({ label, required, hint, info, children, basis }) {
  const flexBasis = basis == null ? undefined : String(basis).includes("%") ? basis : `${basis}px`;
  return (
    <div style={flexBasis ? { flex: `1 1 ${flexBasis}`, minWidth: 0 } : undefined}>
      {label && (
        <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-900 mb-1.5">
          <span>
            {label}
            {required && <span className="text-rose-600 ml-0.5">*</span>}
          </span>
          {info && <InfoTooltip text={info} />}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/** A row that lays fields out side by side when there's room, and wraps each
 * onto its own line once the container gets too narrow to fit them — driven
 * purely by the element's own rendered width, not the browser viewport. */
function Row({ children, gap = "0.75rem", rowGap = "1.25rem" }) {
  return (
    <div className="flex flex-wrap" style={{ gap: `${rowGap} ${gap}` }}>
      {children}
    </div>
  );
}

const inputCls =
  "w-full text-sm px-3.5 py-2.5 rounded-lg border-2 border-stone-200 bg-stone-50 " +
  "focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors";

// const AGE_CLASSES = ["ลูกช้าง", "วัยรุ่น", "โตเต็มวัย", "ชรา", "ไม่ทราบ"];

// function AgeSelect({ value, onChange }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);
//   useEffect(() => {
//     function onDocClick(e) {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false);
//     }
//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, []);
//   return (
//     <div className="relative" ref={ref}>
//       <button
//         type="button"
//         onClick={() => setOpen((o) => !o)}
//         className={inputCls + " flex justify-between items-center text-left"}
//       >
//         <span className={value ? "" : "text-stone-400"}>{value || "เลือกช่วงอายุ"}</span>
//         <span className="text-stone-400">▾</span>
//       </button>
//       {open && (
//         <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border-2 border-stone-200 rounded-lg shadow-lg overflow-hidden">
//           <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50">เลือกช่วงอายุ</button>
//           {AGE_CLASSES.map((a) => (
//             <button key={a} type="button" onClick={() => { onChange(a); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50">{a}</button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

function AccordionField({ label, required, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-stone-200 rounded-lg overflow-hidden mb-3 last:mb-0">
      <div onClick={() => setOpen((o) => !o)} className="flex justify-between items-center px-4 py-3 cursor-pointer">
        <span className="text-sm font-semibold">
          {label}{required && <span className="text-rose-600 ml-0.5">*</span>}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-0.5">{value}</span>
          <span className={"text-stone-400 transition-transform " + (open ? "rotate-180" : "")}>▾</span>
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <Row gap="0.6rem">
            {options.map((opt) => (
              <div key={opt} style={{ flex: "1 1 160px" }}>
                <Choice checked={value === opt} onChange={() => { onChange(opt); setOpen(false); }}>{opt}</Choice>
              </div>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}

function TextInput(props) {
  return <input {...props} className={inputCls + " " + (props.className || "")} />;
}
const selectCls = inputCls + " appearance-none bg-no-repeat pr-9";
const selectArrowStyle = {
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.75rem center",
  backgroundSize: "16px 16px",
};
function Select({ children, style, ...props }) {
  return (
    <select {...props} className={selectCls + " " + (props.className || "")} style={{ ...selectArrowStyle, ...style }}>
      {children}
    </select>
  );
}
function TextArea(props) {
  return <textarea {...props} className={inputCls + " min-h-20 resize-y " + (props.className || "")} />;
}

function AutocompleteInput({ value, onChange, items, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.aliases || []).some((a) => a.toLowerCase().includes(q))
      );

  function pick(it) {
    const matchedAlias = q && !it.name.toLowerCase().includes(q)
      ? (it.aliases || []).find((a) => a.toLowerCase().includes(q))
      : null;
    // console.log("เลือก:", it.name);
    onChange(it.name, matchedAlias ? query.trim() : "");
    setQuery(it.name);
    setOpen(false);
  }

  function handleBlur() {
    window.setTimeout(() => {
      const exact = items.find(
        (it) => it.name === query.trim() || (it.aliases || []).includes(query.trim())
      );
      if (exact && exact.name !== query.trim()) {
        onChange(exact.name, query.trim());
        setQuery(exact.name);
      } else if (!exact) {
        onChange(query.trim(), "");
      }
    }, 120);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <TextInput
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white border-2 border-stone-200 rounded-lg shadow-lg">
          {filtered.map((it, index) => (
            <button
              type="button"
              key={`${it.name}-${index}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(it)}
              className="w-full text-left px-3.5 py-2 text-sm hover:bg-amber-50"
            >
              {it.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Choice({ checked, onChange, type = "radio", name, value, children }) {
  return (
    <label
      className={
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border-2 cursor-pointer text-sm transition-colors " +
        (checked ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-stone-50 hover:border-emerald-400")
      }
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-amber-600 w-4 h-4 shrink-0"
      />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}

function Switch({ checked, onChange }) {
  return (
    <label className="relative inline-flex h-6 w-11 items-center cursor-pointer shrink-0">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span className="absolute inset-0 rounded-full bg-stone-300 peer-checked:bg-emerald-600 transition-colors" />
      <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

const NAME_PREFIX_MAP = {
  "น.ส.": "นางสาว", "ด.ช.": "เด็กชาย", "ด.ญ.": "เด็กหญิง",
};
const NAME_PREFIX_RE = /^(นางสาว|น\.ส\.|นาง|นาย|เด็กชาย|ด\.ช\.|เด็กหญิง|ด\.ญ\.)\s*/;

/** แยกชื่อเต็มเป็น คำนำหน้า / ชื่อ / นามสกุล
 *  token แรกคือชื่อ ที่เหลือทั้งหมดคือนามสกุล — รองรับ "สมชาย ณ อยุธยา" */
function splitThaiName(raw, prefixes) {
  let rest = String(raw || "").replace(/\s+/g, " ").trim();
  let prefix = "";

  const m = rest.match(NAME_PREFIX_RE);
  if (m) {
    const found = NAME_PREFIX_MAP[m[1]] || m[1];
    if (prefixes.includes(found)) {
      prefix = found;
      rest = rest.slice(m[0].length).trim();
    }
  }

  const parts = rest.split(" ").filter(Boolean);
  return { prefix, first: parts[0] || "", last: parts.slice(1).join(" ") };
}

function NameRow({ prefix, first, last, onPrefix, onFirst, onLast, prefixes = PREFIXES }) {

  function applyFullName(v) {
    const p = splitThaiName(v, prefixes);
    if (p.prefix) onPrefix(p.prefix);
    onFirst(p.first);
    if (p.last) onLast(p.last);
  }

  // แยกทันที เฉพาะตอน autofill หรือวางข้อความ (ค่าเพิ่มขึ้นทีละหลายตัวอักษร)
  function handleFirstChange(v) {
    if (/\s/.test(v.trim()) && v.length - String(first || "").length > 1) {
      applyFullName(v);
      return;
    }
    onFirst(v);
  }

  // พิมพ์เองทีละตัว ค่อยแยกตอนออกจากช่อง
  function handleFirstBlur() {
    const v = String(first || "");
    if (/\s/.test(v.trim())) applyFullName(v);
    else if (v !== v.trim()) onFirst(v.trim());
  }

  return (
    <Row gap="0.6rem">
      <div style={{ flex: "1 1 110px", minWidth: 0 }}>
        <Select value={prefix} onChange={(e) => onPrefix(e.target.value)} autoComplete="honorific-prefix">
          {prefixes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      <div style={{ flex: "2 1 150px", minWidth: 0 }}>
        <TextInput
          placeholder="ชื่อ"
          autoComplete="given-name"
          value={first}
          onChange={(e) => handleFirstChange(e.target.value)}
          onBlur={handleFirstBlur}
        />
      </div>
      <div style={{ flex: "2 1 150px", minWidth: 0 }}>
        <TextInput
          placeholder="นามสกุล"
          autoComplete="family-name"
          value={last}
          onChange={(e) => onLast(e.target.value)}
        />
      </div>
    </Row>
  );
}

async function fileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      resolve(
        reader.result.split(",")[1]
      );

    };

    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };

    reader.readAsDataURL(file);

  });

}

// async function uploadAttachment(files) {

//   const response = await fetch(API, {

//     method: "POST",

//     headers: {
//       "Content-Type": "application/json"
//     },

//     body: JSON.stringify({

//       action: "uploadAttachment",

//       files: files.map(file => ({

//         fileName: file.fileName,

//         mimeType: file.mimeType,

//         bytes: file.base64

//       }))

//     })

//   });

//   if (!response.ok) {

//     throw new Error("Upload failed.");

//   }

//   return await response.json();

// }

function PhotoUploader({ photos, onAdd, onRemove, small }) {
const handleFiles = async (e) => {

  const files = Array.from(
    e.target.files || []
  );
  if(files.length === 0){
    return;
  }

  const added = await Promise.all(

    files.map(async (file) => ({

      id: uid("ph"),

      file,

      preview: URL.createObjectURL(file),

      fileName: file.name,

      mimeType: file.type,

      size: file.size,
      
      sizeKB: Math.round(file.size / 1024),

      base64: await fileToBase64(file)

    }))

  );

  // const uploaded = await uploadAttachment(added);

  //   if (!Array.isArray(uploaded)) {
  //     throw new Error("Invalid upload response.");
  //   }

  //   const result = added.map((item, index) => ({

  //     ...item,

  //     ...(uploaded[index] || {})

  //   }));

  onAdd(added);

  e.target.value = "";

};
  return (
    <div>
      <label
        className={
          "flex flex-col items-center justify-center gap-1 border-2 border-dashed border-stone-200 " +
          "rounded-lg bg-stone-50 hover:border-amber-500 cursor-pointer text-center transition-colors " +
          (small ? "py-3" : "py-5")
        }
      >
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        <Camera size={18} className="text-stone-400" />
        <span className="text-xs text-stone-600">
          <b className="text-amber-600">คลิกเพื่อเลือกไฟล์</b> หรือลากภาพมาวางที่นี่
        </span>
      </label>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-3">
          {photos.map((p) => (
            <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-stone-200">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { 
                  URL.revokeObjectURL(p.preview);
                  onRemove(p.id);
                }}
                className="absolute top-0.5 right-0.5 rounded-full bg-stone-900/70 text-white text-xs leading-none flex items-center justify-center"
                style={{ width: 18, height: 18 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryShell({ tag, onRemove, children }) {
  return (
    <div className="border-2 border-stone-200 rounded-xl p-4 bg-stone-50">
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-xs bg-emerald-900 text-white px-2.5 py-0.5 rounded">{tag}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-rose-600 text-xs flex items-center gap-1 px-1.5 py-1 rounded hover:bg-rose-50"
        >
          ลบ <X size={12} />
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SectionHeader({ num, title, desc }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 text-xs uppercase tracking-wider font-semibold text-amber-700 mb-1.5">
        <span className="font-mono bg-rose-50 text-rose-600 rounded px-2 py-0.5 text-xs">
          {String(num).padStart(2, "0")}
        </span>
        ส่วนที่ {num}
      </div>
      <svg viewBox="0 0 800 34" preserveAspectRatio="none" className="w-full h-8 opacity-50 mb-3">
        <path d="M0 20 Q 80 2 160 20 T 320 20 T 480 20 T 640 20 T 800 20" stroke="#B6742A" strokeWidth="1.2" fill="none" />
        <path d="M0 28 Q 80 14 160 28 T 320 28 T 480 28 T 640 28 T 800 28" stroke="#A9C2AC" strokeWidth="1.2" fill="none" />
      </svg>
      <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight mb-1.5">{title}</h2>
      <p className="text-sm text-stone-600 max-w-xl leading-relaxed">{desc}</p>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={"bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-7 space-y-5 " + className}>
      {children}
    </div>
  );
}

const createElephant = () => ({
  id: crypto.randomUUID(),

  elephantCode: "",

  elephantName: "",

  sex: "ไม่ทราบ",

  ageClass: "",

  hasHerd: false,

  herdName: "",

  remark: "",

  photos: []
});

/* ---------------- main component ---------------- */

export default function Cho3Form() {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [stepError, setStepError] = useState(false);
  const [data, setData] = useState(initialData);

  // =======================
// Master Data
// =======================

const [offices, setOffices] = useState([]);

const [masterLoading, setMasterLoading] = useState(true);

const [forestAreas, setForestAreas] = useState([]);

const [patrolSets, setPatrolSets] = useState([]);

const [activities, setActivities] = useState([]);

const [positions, setPositions] = useState([]);

const [properties, setProperties] = useState([]);

const [crops, setCrops] = useState([]);

const [observationTypes, setObservationTypes] = useState([]);

const [officers, setOfficers] = useState([]);

const [elephants, setElephants] = useState([]);

const [provinces, setProvinces] = useState([]);
const [districts, setDistricts] = useState([]);
const [subdistricts, setSubdistricts] = useState([]);

const areaData = forestAreas.reduce((result, area) => {

  // หา office จาก officeId
  const office = offices.find(
    (o) => o.officeId === area.officeId
  );

  if (!office) return result;

  const officeName = office.officeName;

  const fullName = `${area.areaType}${area.areaName}`;

  if (!result[officeName]) {
    result[officeName] = [];
  }

  result[officeName].push(fullName);

  return result;

}, {});

const patrolData = patrolSets.reduce((result, patrol) => {

  // หา Area จาก areaId
  const area = forestAreas.find(
    (a) => a.areaId === patrol.areaId
  );

  if (!area) return result;

  const fullName = `${area.areaType}${area.areaName}`;

  if (!result[fullName]) {
    result[fullName] = [];
  }

  result[fullName].push(patrol.setName);

  return result;

}, {});

const jointSuggest = forestAreas.reduce((result, area) => {

  const fullName = `${area.areaType}${area.areaName}`;

  if (!result[area.areaType]) {
    result[area.areaType] = [];
  }

  result[area.areaType].push(fullName);

  return result;

}, {});

  // Measure the app's own rendered width (not the browser viewport) so the
  // layout responds to the space it actually has, wherever it's embedded.
  const [rootRef, rootWidth] = useElementWidth();
  const sidebarOnTop = rootWidth > 0 && rootWidth < 900; // sidebar moves to a top bar
  const compactStepper = rootWidth > 0 && rootWidth < 560; // too tight even for a scroll strip — show current step only
  useEffect(() => {

async function loadMaster() {

    setMasterLoading(true);

    try {

      const [
  officeRes,
  areaRes,
  patrolRes,
  activityRes,
  positionRes,
  propertyRes,
  cropRes,
  observationRes,
  officerRes,
  elephantRes,
  provinceRes,
  districtRes,
  subdistrictRes,
] = await Promise.all([

        fetch(API + "?action=office"),
        fetch(API + "?action=forestArea"),
        fetch(API + "?action=patrol"),
        fetch(API + "?action=activity"),
        fetch(API + "?action=position"),
        fetch(API + "?action=property"),
        fetch(API + "?action=crop"),
        fetch(API + "?action=observationType"),
        fetch(API + "?action=officer"),
        fetch(API + "?action=elephant"),
        fetch(API + "?action=province"),
fetch(API + "?action=district"),
fetch(API + "?action=subdistrict"),

      ]);

      const officeData = await officeRes.json();
      console.log("Office :", officeData);
      setOffices(officeData);

      const areaData = await areaRes.json();
      console.log("ForestArea :", areaData);
      setForestAreas(areaData);

      const patrolData = await patrolRes.json();
      console.log("PatrolSet :", patrolData);
      setPatrolSets(patrolData);

      const activityData = await activityRes.json();
      console.log("Activity :", activityData);
      setActivities(activityData.data);

      const positionData = await positionRes.json();
      console.log("Position :", positionData);
      setPositions(positionData);

      const propertyData = await propertyRes.json();
      console.log("Property :", propertyData);
      setProperties(propertyData);

      const cropData = await cropRes.json();
      console.log("Crop :", cropData);
      setCrops(cropData);

      const observationData = await observationRes.json();
      console.log("ObservationType :", observationData);
      setObservationTypes(observationData);

      const officerData = await officerRes.json();
      console.log("Officer :", officerData);
      setOfficers(officerData);

      const elephantData = await elephantRes.json();
      console.log("Elephant :", elephantData);
      setElephants(elephantData);

      const provinceData = await provinceRes.json();
      console.log("Province :", provinceData);
      setProvinces(provinceData);

      const districtData = await districtRes.json();
      console.log("District :", districtData);
      setDistricts(districtData);

      const subdistrictData = await subdistrictRes.json();
      console.log("Subdistrict :", subdistrictData);
      setSubdistricts(subdistrictData);

} catch (err) {

      console.error(err);

    } finally {

      setMasterLoading(false);

    }

  }

  loadMaster();

}, []);
  const stepRefs = useRef([]);

  useEffect(() => {
    if (!sidebarOnTop || compactStepper) return;
    const el = stepRefs.current[step - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step, sidebarOnTop, compactStepper]);

  const set = (field, value) => setData((d) => ({ ...d, [field]: value }));
  const setObservation = (value) =>
  setData((d) => ({
    ...d,
    observation: value
  }));
  const setHerd = (value) =>
  setObservation({
    ...data.observation,
    herd: value
  });
  const addElephant = () => {
  setObservation({
    ...data.observation,
    elephants: [
      ...data.observation.elephants,
      createElephant()
    ]
  });
  };
  const removeElephant = (id) => {
  setObservation({
    ...data.observation,
    elephants: data.observation.elephants.filter(
      (e) => e.id !== id
    )
  });
  };
  const updateElephant = (id, patch) => {
  setObservation({
    ...data.observation,
    elephants: data.observation.elephants.map((e) =>
      e.id === id
        ? { ...e, ...patch }
        : e
    )
  });
  };
  const getElephantTitle = (elephant, index) => {
  if (elephant.elephantName)
    return `ช้างตัวที่ ${index + 1} : ${elephant.elephantName}`;

  if (elephant.elephantCode)
    return `ช้างตัวที่ ${index + 1} : ${elephant.elephantCode}`;

  return `ช้างตัวที่ ${index + 1}`;
  };
  const setSkip = (key, value) => setData((d) => ({ ...d, skip: { ...d.skip, [key]: value } }));

  const goTo = (n) => {
    if (n < 1 || n > 7) return;
    setStep(n);
    setMaxReached((m) => Math.max(m, n));
  };

  const REQUIRED_FIELDS_BY_STEP = {
  1: ["office", "area", "date", "time"],
  3: ["activityId"],
  6: ["hasDamage"],
  7: ["recorderFirst", "recorderLast", "recorderPos", "recorderOrg", "recorderPhone"],
};

function isStepValid(n) {
  if (n === 5) {
    return Boolean(data.observation.seeForm) && Boolean(data.observation.encounterType);
  }
  const fields = REQUIRED_FIELDS_BY_STEP[n];
  if (!fields) return true;
  return fields.every((f) => String(data[f] || "").trim() !== "");
}

useEffect(() => { setStepError(false); }, [step]);

  /* ---- joint units ---- */
  const addJoint = () => {
    const name = data.jointNameInput.trim();
    if (!name) return;
    set("jointUnits", [...data.jointUnits, { id: uid("j"), type: data.jointType, name }]);
    set("jointNameInput", "");
  };
  const removeJoint = (id) => set("jointUnits", data.jointUnits.filter((j) => j.id !== id));

  /* ---- elephant ids (step 5) ---- */
  const addElephantId = () => {
  const name = data.elephantIdInput.trim();
  if (!name) return;

  set("elephantIds", [
    ...data.elephantIds,
    {
      id: uid("e"),
      elephantId: "",
      elephantName: name
    }
  ]);

  set("elephantIdInput", "");
};
  const removeElephantId = (id) => set("elephantIds", data.elephantIds.filter((e) => e.id !== id));

  /* ---- generic repeater helpers ---- */
  const addEntry = (key, entry) => set(key, [...data[key], entry]);
  const removeEntry = (key, id) => set(key, data[key].filter((e) => e.id !== id));
  const patchEntry = (key, id, patch) =>
    set(key, data[key].map((e) => (e.id === id ? { ...e, ...patch } : e)));

  /* ---- geolocation ---- */
  const getGps = () => {
    if (!navigator.geolocation) {
      set("geoHint", "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง กรุณากรอกพิกัดเอง");
      return;
    }
    set("geoHint", "กำลังค้นหาตำแหน่ง...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        set("geo", { lat: latitude, lon: longitude, accuracy });
        set("geoHint", "บันทึกตำแหน่งเรียบร้อยแล้ว");
      },
      () => set("geoHint", "ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือกรอกพิกัดเอง")
    );
  };

  const resetAll = () => {
    setData(initialData);
    setStep(1);
    setMaxReached(1);
    setSubmitted(false);
  };

  const damageCounts = { people: data.people.length, property: data.properties.length, crop: data.crops.length, elephant: data.elephantDamages.length };
  const selectedProvince = provinces.find(
  (p) => p.provinceName === data.province
);

const districtOptions = selectedProvince
  ? districts.filter(
      (d) => d.provinceId === selectedProvince.provinceId
    )
  : [];

const selectedDistrict = districtOptions.find(
  (d) => d.districtName === data.district
);

const subdistrictOptions = selectedDistrict
  ? subdistricts.filter(
      (s) => s.districtId === selectedDistrict.districtId
    )
  : [];

function buildPayload() {

  // Master
  const office = offices.find(
    o => o.officeName === data.office
  );

  const area = forestAreas.find(
    a => `${a.areaType}${a.areaName}` === data.area
  );

  const patrol = patrolSets.find(
    p =>
      String(p.areaId).trim() === String(area?.areaId).trim() &&
      String(p.setName).trim() === String(data.setName).trim()
  );

  const province = provinces.find(
    p => p.provinceName === data.province
  );

  const district = districts.find(
    d => d.districtName === data.district
  );

  const subdistrict = subdistricts.find(
    s => s.subdistrictName === data.subdistrict
  );

  const recorderArea = forestAreas.find(
  a => `${a.areaType}${a.areaName}` === data.recorderOrg
  );

  return {

    reportDate: new Date().toISOString(),

    officeId: office?.officeId ?? "",

    areaId: area?.areaId ?? "",

    setId: patrol?.setId ?? "",

    incidentDate: data.date,

    incidentTime: data.time,

    activityId: data.activityId,

    activityOther: data.activityOther,

    locationMethod: data.method,

    provinceId: province?.provinceId ?? "",

    districtId: district?.districtId ?? "",

    subdistrictId: subdistrict?.subdistrictId ?? "",

    utmZone: data.utmZone,

    utmX: data.coord1,

    utmY: data.coord2,

    latitude: data.geo?.lat ?? "",

    longitude: data.geo?.lon ?? "",

    hasDamage: data.hasDamage,

    officer: {
      prefix: data.recorderPrefix,
      firstName: data.recorderFirst,
      lastName: data.recorderLast,
      positionId: data.recorderPos,
      areaId: recorderArea?.areaId ?? "",
      phone: data.recorderPhone
    },

    jointUnits: data.jointUnits,

    observation: data.observation,

    people: data.people,

    properties: data.properties,

    crops: data.crops,

    elephantDamages: data.elephantDamages

  };

}

async function submitReport() {

  const payload = buildPayload();
  setSubmitting(true);

  const MAX_ATTEMPTS = 4;
  const PER_ATTEMPT_TIMEOUT_MS = 90000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    setSubmitAttempt(attempt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);

    try {
      const response = await fetch(API, {
        method: "POST",
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);

      console.log(response.status);
      console.log(response.url);

      const text = await response.text();
      console.log(text);

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("ระบบตอบกลับไม่ถูกต้อง (อาจมีผู้ใช้งานพร้อมกันจำนวนมาก)");
      }

      if (result.success) {
        setShowConfirm(false);
        setSubmitted(true);
        setSubmitting(false);
        setSubmitAttempt(0);
        return;
      }

      // ข้อความนี้แปลว่า "รอคิวนานเกินไป" (คนอื่นกำลังบันทึกอยู่) ไม่ใช่ข้อมูลผิดพลาดจริง
      // โยนเข้า catch เพื่อให้ retry ต่อ แทนที่จะแจ้ง error ให้ผู้ใช้ทันที
      if (result.message && result.message.includes("หมดเวลาการล็อก")) {
        throw new Error(result.message);
      }

      alert(result.message);
      setSubmitting(false);
      setSubmitAttempt(0);
      return;

    } catch (err) {
      clearTimeout(timer);
      console.error(`ส่งรายงานพลาด (ครั้งที่ ${attempt}/${MAX_ATTEMPTS}) :`, err);

      if (attempt === MAX_ATTEMPTS) {
        alert(
          "ส่งรายงานไม่สำเร็จหลังจากลองหลายครั้ง (อาจมีผู้ใช้งานพร้อมกันจำนวนมาก)\n" +
          "กรุณาลองกดส่งอีกครั้ง หรือรอสักครู่แล้วลองใหม่\n\n" +
          err.message
        );
        setSubmitting(false);
        setSubmitAttempt(0);
        return;
      }

      const delayMs = 5000 + Math.random() * 5000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

  if (submitted) {
    const recorder = data.recorderFirst || data.recorderLast
      ? `${data.recorderPrefix}${data.recorderFirst} ${data.recorderLast}`.trim()
      : "—";
    const seeForms = data.observation.seeForm || "—";
    const activityText = data.activityId === "OTHER" ? data.activityOther || "—" : data.activityId || "—";
    const damageText = data.hasDamage === "yes" ? "มีความเสียหาย" : data.hasDamage === "no" ? "ไม่มีความเสียหาย" : "—";
    const observationSummary = data.observation.encounterType === "herd" ? `${data.observation.herd.countActual || "—"} ตัว`: "ช้างเดี่ยว";
    const encounterType = data.observation.encounterType === "herd" ? "ฝูงช้าง" : "ช้างเดี่ยว";
    const lines = [
        ["สำนักบริหารพื้นที่อนุรักษ์", data.office || "—"],
        ["พื้นที่อนุรักษ์", data.area || "—"],
        ["ชื่อชุด", data.setName ? `ชุดที่ ${data.setName}` : "—"],
        ["วันที่ / เวลา", `${data.date || "—"} · ${data.time || "—"}`],
        ["หน่วยงานสนธิกำลัง", `${data.jointUnits.length} หน่วยงาน`],
        // ["สาเหตุออกปฏิบัติงาน", activityText],
        // ["รูปแบบการพบเห็น", seeForms],
        // ["ลักษณะการพบ", encounterType],
        // ["รายละเอียดการพบ", observationSummary],
        ["ความเสียหาย", damageText],
        ["ผู้บันทึก", `${recorder} (${data.recorderOrg || "—"})`],
        ["เบอร์โทรติดต่อ", formatPhoneTH(data.recorderPhone) || "—"],
    ];   
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-8 font-sans">
        <div className="flex flex-col items-center text-center max-w-2xl w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mb-5">
            <Check size={30} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-950 mb-1.5">ส่งรายงานเรียบร้อยแล้ว</h2>
          <p className="text-stone-600 max-w-md">บันทึกแบบฟอร์ม ช.3 สำเร็จ ข้อมูลด้านล่างคือสรุปรายการที่บันทึกไว้</p>
          <div className="text-left bg-white border border-stone-200 rounded-2xl shadow-sm w-full p-6 sm:p-7 mt-6">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-amber-700 mb-1">สรุปรายงาน</h3>
            {lines.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-stone-100 last:border-none text-sm">
                <span className="text-stone-600">{k}</span>
                <span className="font-semibold text-right">{v}</span>
              </div>
            ))}
          </div>
          <button
            onClick={resetAll}
            className="mt-6 px-5 py-2.5 rounded-lg border-2 border-stone-200 font-semibold text-sm hover:border-emerald-400 hover:bg-stone-50"
          >
            + บันทึกรายงานใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4 sm:py-10 sm:px-6">
      <div
        ref={rootRef}
        className={
          "max-w-6xl mx-auto rounded-2xl shadow-xl border border-stone-200 overflow-hidden font-sans text-stone-900 flex " +
          (sidebarOnTop ? "flex-col" : "flex-row")
        }
      >
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      {/* ---------------- SIDEBAR / STEPPER ---------------- */}
      <aside
        className="bg-linear-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-emerald-50 p-5 sm:p-7 min-w-0"
        style={sidebarOnTop ? {} : { width: 280, flexShrink: 0 }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <img src={dnpLogo} alt="ตราสัญลักษณ์กรมอุทยานแห่งชาติ" className="w-10 h-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-emerald-300 font-medium truncate">
              กรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช
            </div>
            <h1 className="text-lg font-bold leading-tight">แบบฟอร์ม ช.3</h1>
          </div>
        </div>
        {!compactStepper && (
          <p className="text-xs text-emerald-300 mt-3 pb-4 mb-5 border-b border-dashed border-emerald-700/50 leading-relaxed">
            รายงานเหตุช้างป่าออกนอกพื้นที่อนุรักษ์ — กรอกตามลำดับทีละส่วน
          </p>
        )}

        {compactStepper ? (
          /* -------- compact: current step only, can never overflow -------- */
          <div className="flex items-center gap-3 mt-3">
            <StepCircle done={false} active size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-emerald-300">ส่วนที่ {step} จาก {STEPS.length}</div>
              <div className="text-sm font-semibold text-white truncate">{STEPS[step - 1].name}</div>
              <div className="h-1.5 rounded-full bg-emerald-800/70 mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${(step / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : sidebarOnTop ? (
          /* -------- horizontal: auto-scrolling strip, hidden scrollbar -------- */
          <div className="no-scrollbar overflow-x-auto min-w-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <ol className="flex items-start" style={{ width: "max-content" }}>
              {STEPS.map((s, i) => {
                const active = s.n === step;
                const done = s.n < maxReached;
                const locked = s.n > maxReached;
                const prevDone = i === 0 ? true : s.n - 1 < maxReached;
                return (
                  <React.Fragment key={s.n}>
                    {i > 0 && (
                      <div
                        className={"h-0.5 shrink-0 mt-4 " + (prevDone ? "bg-emerald-500" : "bg-emerald-700/50")}
                        style={{ width: 28 }}
                      />
                    )}
                    <li
                      ref={(el) => (stepRefs.current[i] = el)}
                      onClick={() => !locked && goTo(s.n)}
                      className={"flex flex-col items-center gap-1.5 shrink-0 " + (locked ? "cursor-default opacity-50" : "cursor-pointer")}
                      style={{ width: 92 }}
                    >
                      <StepCircle done={done} active={active} />
                      <span className="text-[10px] uppercase tracking-wider text-emerald-300 text-center">{s.label}</span>
                      <span className={"text-xs text-center leading-snug " + (active ? "font-semibold text-white" : "text-emerald-100")}>
                        {s.name}
                      </span>
                    </li>
                  </React.Fragment>
                );
              })}
            </ol>
          </div>
        ) : (
          /* -------- vertical: connected checklist -------- */
          <ol>
            {STEPS.map((s, i) => {
              const active = s.n === step;
              const done = s.n < maxReached;
              const locked = s.n > maxReached;
              const prevDone = i === 0 ? true : s.n - 1 < maxReached;
              return (
                <li key={s.n}>
                  {i > 0 && (
                    <div className="flex" style={{ width: 34, justifyContent: "center" }}>
                      <div className={"w-0.5 " + (prevDone ? "bg-emerald-500" : "bg-emerald-700/50")} style={{ height: 16 }} />
                    </div>
                  )}
                  <div
                    onClick={() => !locked && goTo(s.n)}
                    className={"flex items-center gap-3 pb-1 " + (locked ? "cursor-default opacity-50" : "cursor-pointer")}
                  >
                    <StepCircle done={done} active={active} />
                    <span className="min-w-0">
                      <span className="block text-xs uppercase tracking-wider text-emerald-300">{s.label}</span>
                      <span className={"block text-sm truncate " + (active ? "font-semibold text-white" : "text-emerald-100")}>
                        {s.name}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {!sidebarOnTop && (
          <div className="text-xs text-emerald-300 pt-4 mt-3 border-t border-dashed border-emerald-700/50 leading-relaxed">
            แบบฟอร์มนี้ใช้สำหรับเจ้าหน้าที่ภาคสนามเท่านั้น หากพบเหตุฉุกเฉินร้ายแรง โปรดแจ้งสายด่วนพิทักษ์ป่า 1362 ก่อนบันทึกข้อมูล
          </div>
        )}
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="min-w-0 max-w-3xl mx-auto w-full p-4 sm:p-8 pb-16" style={{ flex: "1 1 auto" }}>
        {/* STEP 1 */}
        {step === 1 && (
          <section>
            <SectionHeader num={1} title="หน่วยงานที่รายงาน" desc="ระบุสังกัดและช่วงเวลาที่เกิดเหตุ เพื่อใช้อ้างอิงในระบบรายงาน" />
            <Card>
<Field
  label={
    <>
      สำนักบริหารพื้นที่อนุรักษ์
      {masterLoading && (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 align-middle ml-1"
          style={{ borderColor: "#FAEEDA", borderTopColor: "#B6742A", animation: "spin 0.7s linear infinite" }}
        />
      )}
    </>
  }
  required
  hint={masterLoading ? "กำลังโหลดรายชื่อสำนักจากระบบ กรุณารอสักครู่..." : "ปรากฎเฉพาะสำนักที่พบการกระจายของช้างป่าในพื้นที่รับผิดชอบ"}
>
  <Select
    value={data.office}
    disabled={masterLoading}
    onChange={(e) => { set("office", e.target.value); set("area", ""); }}
    className={masterLoading ? "opacity-60 cursor-wait" : ""}
  >
    <option value="">{masterLoading ? "กำลังโหลดข้อมูล..." : "— เลือกสำนักบริหารพื้นที่อนุรักษ์ —"}</option>
    {offices.map((o) => (
      <option key={o.officeId} value={o.officeName}>{o.officeName}</option>
    ))}
  </Select>
</Field>
<style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              <Field label="พื้นที่อนุรักษ์" required hint="ตัวเลือกจะกรองตามสำนักบริหารพื้นที่อนุรักษ์ที่เลือกไว้ด้านบน">
                <TextInput
                  list="areaList"
                  placeholder="พิมพ์เพื่อค้นหาพื้นที่อนุรักษ์..."
                  value={data.area}
                  onChange={(e) => setData((d) => ({ ...d, area: e.target.value, setName: "" }))}
                  autoComplete="off"
                />
                <datalist id="areaList">
                  {(areaData[data.office] || []).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </Field>
              <Field label="ชื่อชุด" hint="เลือกชุดที่รับผิดชอบรายงานนี้ — ตัวเลือกจะกรองตามพื้นที่อนุรักษ์ที่เลือกไว้ด้านบน">
                <Select
                  value={data.setName}
                  onChange={(e) => set("setName", e.target.value)}
                  disabled={!(patrolData[data.area] || []).length}
                >
                  <option value="">
  {(patrolData[data.area] || []).length
    ? "— เลือกชื่อชุด —"
    : "ไม่มีข้อมูลชุดสำหรับพื้นที่นี้"}
</option>
                  {(patrolData[data.area] || []).map((s) => (
  <option key={s} value={s}>
    ชุดที่ {s}
  </option>
))}
                </Select>
              </Field>
              <Row>
                <Field label="วันที่เกิดเหตุ" required basis="200">
                  <TextInput type="date" value={data.date} onChange={(e) => set("date", e.target.value)} />
                </Field>
                <Field label="เวลาที่ออกปฏิบัติการ" required basis="200" info="AM ใช้สำหรับช่วงเวลาก่อนเที่ยง (00:00-11:59 น.) และ PM ใช้สำหรับช่วงเวลาหลังเที่ยง (12:00-23:59 น.)">
                  <TextInput type="time" value={data.time} onChange={(e) => set("time", e.target.value)} />
                </Field>
              </Row>
            </Card>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section>
            <SectionHeader num={2} title="หน่วยงานที่สนธิกำลัง" desc="เพิ่มหน่วยงานทุกแห่งที่ร่วมปฏิบัติการในเหตุการณ์นี้ เพิ่มได้มากกว่าหนึ่งประเภท" />
            <Card>
              <Field label="ประเภทพื้นที่อนุรักษ์ที่ร่วมสนธิกำลัง" required>
                <Select value={data.jointType} onChange={(e) => set("jointType", e.target.value)}>
                  {JOINT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="ชื่อหน่วยงาน">
                <div className="flex gap-2.5">
                  <TextInput
                    list="jointList"
                    placeholder="พิมพ์ค้นหาหรือพิมพ์ชื่อหน่วยงานเพิ่มเติม..."
                    value={data.jointNameInput}
                    onChange={(e) => set("jointNameInput", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addJoint())}
                    autoComplete="off"
                  />
                  <datalist id="jointList">
  {(jointSuggest[data.jointType] || []).map((n, index) => (
    <option
        key={`${n}-${index}`}
        value={n}
    />
))}
</datalist>
                  <button type="button" onClick={addJoint} className="shrink-0 px-4 rounded-lg border-2 border-stone-200 font-semibold text-sm hover:border-emerald-400">
                    + เพิ่ม
                  </button>
                </div>
              </Field>
              <Field label="หน่วยงานที่เพิ่มแล้ว">
                {data.jointUnits.length === 0 ? (
                  <p className="text-xs text-stone-400">ยังไม่มีหน่วยงานที่เพิ่ม</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.jointUnits.map((j) => (
                      <div key={j.id} className="flex items-center border-2 border-stone-200 rounded-xl px-4 py-2.5 bg-stone-50">
                        <span className="font-mono text-xs bg-emerald-900 text-white px-2.5 py-0.5 rounded shrink-0">{j.type}</span>
                        <span className="flex-1 ml-3 text-sm">{j.name}</span>
                        <button type="button" onClick={() => removeJoint(j.id)} className="text-rose-600 text-xs flex items-center gap-1 px-1.5 py-1 rounded hover:bg-rose-100">
                          ลบ <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </Card>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section>
            <SectionHeader num={3} title="ออกปฏิบัติงานเนื่องจาก" desc="เลือกที่มาของการออกปฏิบัติงานครั้งนี้" />
            <Card>
              <Field label="ประเภทกิจกรรม" required>
                <div className="flex flex-col gap-2.5">
                  {[
  ...activities,
  { activityId: "OTHER", activityName: "อื่นๆ" }
].map((a) => (
  <Choice
    key={a.activityId}
    name="activity"
    checked={data.activityId === a.activityId}
    onChange={() => {

  set("activityId", a.activityId);

  if (a.activityId !== "OTHER") {
    set("activityOther", "");
  }

}}
  >
    {a.activityName === "อื่นๆ" ? "อื่น ๆ" : a.activityName}
  </Choice>
))}
                </div>
                {data.activityId === "OTHER" && (
                  <div className="mt-2.5">
                    <TextInput placeholder="ระบุรายละเอียด..." value={data.activityOther} onChange={(e) => set("activityOther", e.target.value)} />
                  </div>
                )}
              </Field>
            </Card>
          </section>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <section>
            <SectionHeader num={4} title="ระบุตำแหน่งบริเวณที่ปฏิบัติงาน" desc="เลือกวิธีระบุพิกัด — ใช้ตำแหน่งปัจจุบันจากอุปกรณ์ หรือกรอกพิกัดเอง" />
            <Card>
              <div className="flex gap-2">
                {[
                  { k: "gps", label: "📍 ใช้ตำแหน่งปัจจุบัน" },
                  { k: "manual", label: "⌨ กรอกพิกัดเอง" },
                ].map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => set("method", t.k)}
                    className={
                      "flex-1 text-center py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors " +
                      (data.method === t.k ? "border-amber-500 bg-amber-50 text-amber-700" : "border-stone-200 bg-stone-50 text-stone-600")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {data.method === "gps" ? (
                <div>
                  <button type="button" onClick={getGps} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm">
                    <MapPin size={16} /> ปักหมุดตำแหน่งที่ยืนอยู่
                  </button>
                  {data.geo && (
                    <div className="flex items-center gap-2.5 mt-3.5 px-4 py-3 rounded-lg bg-emerald-950 text-white font-mono text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      Lat {data.geo.lat.toFixed(5)}, Lon {data.geo.lon.toFixed(5)} · ความแม่นยำ ±{Math.round(data.geo.accuracy)} ม.
                    </div>
                  )}
                  <p className="text-xs text-stone-400 mt-2.5">{data.geoHint}</p>
                </div>
              ) : (
               <div className="space-y-5">
  <Row>
    <Field label="จังหวัด" basis="180">
      <AutocompleteInput
  value={data.province}
  items={provinces.map((p) => ({
    name: p.provinceName,
  }))}
  placeholder="ค้นหาจังหวัด..."
  onChange={(value) =>
    setData((d) => ({
      ...d,
      province: value,
      district: "",
      subdistrict: "",
    }))
  }
/>
    </Field>
    <Field label="อำเภอ" basis="180" info="รายชื่ออำเภอจะกรองให้อัตโนมัติตามจังหวัดที่เลือกไว้ด้านซ้าย ถ้ายังไม่เลือกจังหวัด จะยังไม่มีตัวเลือกให้ขึ้น">
      <AutocompleteInput
  value={data.district}
  items={districtOptions.map((d) => ({
    name: d.districtName,
  }))}
  placeholder={
    selectedProvince
      ? "ค้นหาอำเภอ..."
      : "เลือกจังหวัดก่อน..."
  }
  onChange={(value) =>
    setData((d) => ({
      ...d,
      district: value,
      subdistrict: "",
    }))
  }
/>
    </Field>
    <Field label="ตำบล" basis="180" info="รายชื่อตำบลจะกรองให้อัตโนมัติตามอำเภอที่เลือกไว้ด้านซ้าย ถ้ายังไม่เลือกอำเภอ จะยังไม่มีตัวเลือกให้ขึ้น">
      <AutocompleteInput
  value={data.subdistrict}
  items={subdistrictOptions.map((s) => ({
    name: s.subdistrictName,
  }))}
  placeholder={
    selectedDistrict
      ? "ค้นหาตำบล..."
      : "เลือกอำเภอก่อน..."
  }
  onChange={(value) =>
    set("subdistrict", value)
  }
/>
    </Field>
  </Row>
  <Field label="โซน UTM">
    <Row gap="0.6rem">
      <div style={{ flex: "1 1 100px" }}>
        <Choice name="utmZone" checked={data.utmZone === "47N"} onChange={() => set("utmZone", "47N")}>47N</Choice>
      </div>
      <div style={{ flex: "1 1 100px" }}>
        <Choice name="utmZone" checked={data.utmZone === "48N"} onChange={() => set("utmZone", "48N")}>48N</Choice>
      </div>
    </Row>
  </Field>
  <Row>
    <Field label="UTM X" basis="200">
      <TextInput
        placeholder="เช่น 712345"
        value={data.coord1}
        onChange={(e) => set("coord1", e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
        onKeyDown={(e) => (e.key === "." || e.key === ",") && e.preventDefault()}
        inputMode="numeric"
      />
      {data.coord1 === "" ? (
        <p className="text-xs mt-1.5 leading-relaxed text-stone-400">ตัวเลข 6 หลัก ไม่นับเลข 0 ตัวแรก ไม่มีทศนิยม</p>
      ) : data.coord1.replace(/^0+/, "").length !== 6 ? (
        <p className="text-xs mt-1.5 leading-relaxed text-rose-600">
          ต้องมี 6 หลัก (ไม่นับเลข 0 นำหน้า) — ตอนนี้มี {data.coord1.replace(/^0+/, "").length} หลัก
        </p>
      ) : (
        <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-600">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0">
            <Check size={9} className="text-white" strokeWidth={3.5} />
          </span>
          ถูกต้อง
        </p>
      )}
    </Field>
    <Field label="UTM Y" basis="200">
      <TextInput
        placeholder="เช่น 1583210"
        value={data.coord2}
        onChange={(e) => set("coord2", e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
        onKeyDown={(e) => (e.key === "." || e.key === ",") && e.preventDefault()}
        inputMode="numeric"
      />
      {data.coord2 === "" ? (
        <p className="text-xs mt-1.5 leading-relaxed text-stone-400">ตัวเลข 7 หลัก ไม่นับเลข 0 ตัวแรก ไม่มีทศนิยม</p>
      ) : data.coord2.replace(/^0+/, "").length !== 7 ? (
        <p className="text-xs mt-1.5 leading-relaxed text-rose-600">
          ต้องมี 7 หลัก (ไม่นับเลข 0 นำหน้า) — ตอนนี้มี {data.coord2.replace(/^0+/, "").length} หลัก
        </p>
      ) : (
        <p className="flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-600">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0">
            <Check size={9} className="text-white" strokeWidth={3.5} />
          </span>
          ถูกต้อง
        </p>
      )}
    </Field>
  </Row>
</div>
              )}
            </Card>
          </section>
        )}

        {/* STEP 5 */}
        {step === 5 && (
  <section>
    <SectionHeader num={5} title="รายงานรายละเอียดช้างป่าออกนอกพื้นที่" desc="บันทึกลักษณะการพบเห็นและจำนวนช้างป่าที่พบในเหตุการณ์นี้" />

    <Card>
      <AccordionField
        label="รูปแบบการพบ" required
        value={data.observation.seeForm}
        options={["เห็นตัว", "ร่องรอย"]}
        onChange={(v) => setObservation({ ...data.observation, seeForm: v })}
      />
      <AccordionField
        label="ลักษณะการพบ" required
        value={data.observation.encounterType === "herd" ? "ฝูงช้าง" : "ช้างเดี่ยว"}
        options={["ช้างเดี่ยว", "ฝูงช้าง"]}
        onChange={(v) => setObservation({ ...data.observation, encounterType: v === "ฝูงช้าง" ? "herd" : "single" })}
      />
    </Card>

    {data.observation.encounterType === "herd" && (
      <Card className="mt-5">
        <div className="text-sm font-semibold text-stone-900 mb-4">ข้อมูลฝูง</div>
        <Row>
          <Field label="ชื่อฝูง (ถ้าทราบ)" basis="220">
            <TextInput placeholder="เช่น งาดำ" value={data.observation.herd.herdName} onChange={(e) => setHerd({ ...data.observation.herd, herdName: e.target.value })} />
          </Field>
          <Field label="จำนวนจริง" basis="160" info="จำนวนช้างป่าที่เจ้าหน้าที่สามารถนับได้จริงจากการพบเห็นโดยตรง">
            <TextInput type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={data.observation.herd.countActual} onChange={(e) => setHerd({ ...data.observation.herd, countActual: e.target.value.replace(/[^0-9]/g, "") })} />
          </Field>
          <Field label="จำนวนประมาณการ" basis="160" info="ใช้เมื่อไม่สามารถนับจำนวนช้างป่าได้ครบถ้วน ให้ประเมินจากข้อมูลภาคสนามหรือประสบการณ์ของเจ้าหน้าที่">
            <TextInput type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={data.observation.herd.countEstimate} onChange={(e) => setHerd({ ...data.observation.herd, countEstimate: e.target.value.replace(/[^0-9]/g, "") })} />
          </Field>
          <Field label="หมายเหตุ" basis="100%">
            <TextArea placeholder="พฤติกรรม เส้นทาง หรือข้อสังเกตอื่น ๆ" value={data.observation.herd.remark} onChange={(e) => setHerd({ ...data.observation.herd, remark: e.target.value })} />
          </Field>
          <Field label="แนบภาพ" basis="100%">
            <PhotoUploader
              photos={data.observation.herd.photos}
              onAdd={(added) => setHerd({ ...data.observation.herd, photos: [...data.observation.herd.photos, ...added] })}
              onRemove={(photoId) => setHerd({ ...data.observation.herd, photos: data.observation.herd.photos.filter((p) => p.id !== photoId) })}
            />
          </Field>
        </Row>
      </Card>
    )}

    <Card className="mt-5">
      <div className="text-sm font-semibold text-stone-900 mb-4">ช้างป่าที่สามารถระบุตัวได้</div>
      {data.observation.elephants.length === 0 ? (
        <div className="border-2 border-dashed border-stone-200 rounded-xl py-8 text-center text-sm text-stone-400 mb-4">
          ยังไม่มีข้อมูลช้าง กรุณากด "เพิ่มช้างป่าที่สามารถระบุตัวได้"
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {data.observation.elephants.map((elephant, i) => {
            const isHerd = data.observation.encounterType === "herd";
            return (
              <EntryShell key={elephant.id} tag={getElephantTitle(elephant, i)} onRemove={() => removeElephant(elephant.id)}>
                <Row>
                  <Field label="ชื่อช้าง" basis="200">
                    <TextInput placeholder="ชื่อช้าง (ถ้าทราบ)" value={elephant.elephantName} onChange={(e) => updateElephant(elephant.id, { elephantName: e.target.value })} />
                  </Field>
                  <Field label="รหัสประจำตัวช้างป่า" basis="200" info="สำหรับหน่วยงานที่มีการกำหนดรหัสประจำตัวช้างป่าร่วมกันในพื้นที่ หากไม่มีรหัส สามารถเว้นว่างได้">
                    <TextInput placeholder="รหัสประจำตัว (ถ้าทราบ)" value={elephant.elephantCode} onChange={(e) => updateElephant(elephant.id, { elephantCode: e.target.value })} />
                  </Field>
                  <Field label="เพศ" basis="100%">
                    <Row gap="0.6rem">
                      {["ผู้", "เมีย", "ไม่ทราบ"].map((g) => (
                        <div key={g} style={{ flex: "1 1 100px" }}>
                          <Choice checked={elephant.sex === g} onChange={() => updateElephant(elephant.id, { sex: g })}>{g}</Choice>
                        </div>
                      ))}
                    </Row>
                  </Field>
                  <Field label="ช่วงอายุ" basis="220">
  <Select
    value={elephant.ageClass}
    onChange={(e) =>
      updateElephant(elephant.id, {
        ageClass: e.target.value
      })
    }
  >
    <option value="">— เลือกช่วงอายุ —</option>
    <option value="Young">ลูกช้างเล็ก</option>
    <option value="Calf">ลูกช้างโต</option>
    <option value="Juvenile">วัยรุ่น</option>
    <option value="Subadult">ก่อนเต็มวัย</option>
    <option value="Adult">เต็มวัย</option>
    <option value="Unknown">ไม่ทราบ</option>
  </Select>
</Field>
                  {!isHerd && (
                    <>
                      <Field label="มีฝูงหรือไม่" basis="100%">
                        <Row gap="0.6rem">
                          <div style={{ flex: "1 1 100px" }}>
                            <Choice checked={!elephant.hasHerd} onChange={() => updateElephant(elephant.id, { hasHerd: false, herdName: "" })}>ไม่มี</Choice>
                          </div>
                          <div style={{ flex: "1 1 100px" }}>
                            <Choice checked={elephant.hasHerd} onChange={() => updateElephant(elephant.id, { hasHerd: true })}>มี</Choice>
                          </div>
                        </Row>
                      </Field>
                      {elephant.hasHerd && (
                        <Field label="ชื่อฝูง" info="ควรระบุให้ชัดเจน หากเว้นว่างไว้ ข้อมูลฝูงของช้างตัวนี้จะไม่สามารถเชื่อมโยงกับฝูงที่เคยรายงานไว้ก่อนหน้าได้" basis="220">
                          <TextInput placeholder="เช่น แม่ยาย" value={elephant.herdName} onChange={(e) => updateElephant(elephant.id, { herdName: e.target.value })} />
                        </Field>
                      )}
                    </>
                  )}
                  <Field label="หมายเหตุ / ตำหนิ" basis="100%">
                    <TextArea placeholder="เช่น หูซ้ายแหว่ง งาซ้ายหัก มีปลอกคอ GPS หรือพฤติกรรม เส้นทาง" value={elephant.remark} onChange={(e) => updateElephant(elephant.id, { remark: e.target.value })} />
                  </Field>
                  {!isHerd && (
                    <Field label="แนบภาพ" basis="100%">
                      <PhotoUploader small photos={elephant.photos} onAdd={(added) => updateElephant(elephant.id, { photos: [...elephant.photos, ...added] })} onRemove={(photoId) => updateElephant(elephant.id, { photos: elephant.photos.filter((p) => p.id !== photoId) })} />
                    </Field>
                  )}
                </Row>
              </EntryShell>
            );
          })}
        </div>
      )}
      <AddButton onClick={addElephant}>+ เพิ่มช้างป่าที่สามารถระบุตัวได้</AddButton>
    </Card>
  </section>
)}

        {/* STEP 6 */}
        {step === 6 && (
          <section>
            <SectionHeader
              num={6}
              title="การรายงานความเสียหาย"
              desc="ระบุว่ามีความเสียหายเกิดขึ้นหรือไม่ หากมี ให้กรอกเฉพาะประเภทที่เกี่ยวข้อง ประเภทที่ไม่มีความเสียหายสามารถข้ามได้"
            />
            <Card className="mb-5">
              <Field label="มีความเสียหายเกิดขึ้นหรือไม่" required>
                <Row gap="0.6rem">
                  <div style={{ flex: "1 1 160px" }}>
                    <Choice checked={data.hasDamage === "yes"} onChange={() => set("hasDamage", "yes")}>มีความเสียหาย</Choice>
                  </div>
                  <div style={{ flex: "1 1 160px" }}>
                    <Choice checked={data.hasDamage === "no"} onChange={() => set("hasDamage", "no")}>ไม่มีความเสียหาย</Choice>
                  </div>
                </Row>
              </Field>
            </Card>

            {data.hasDamage === "yes" && (
              <div className="flex flex-col gap-5">
                {/* 6a people */}
                <DamageCard icon={<Users size={16} />} title="คนบาดเจ็บหรือเสียชีวิต" skipped={data.skip.people} onSkip={(v) => setSkip("people", v)}>
                  <div className="flex flex-col gap-3 mb-3">
                    {data.people.map((p, i) => (
                      <EntryShell key={p.id} tag={`คนที่ ${i + 1}`} onRemove={() => removeEntry("people", p.id)}>
                        <Row>
                          <Field label="ประเภทความเสียหาย" basis="100%">
  <Row gap="0.6rem">
    <div style={{ flex: "1 1 140px" }}>
      <Choice name={`condition_${p.id}`} checked={p.condition === "บาดเจ็บ"} onChange={() => patchEntry("people", p.id, { condition: "บาดเจ็บ" })}>บาดเจ็บ</Choice>
    </div>
    <div style={{ flex: "1 1 140px" }}>
      <Choice name={`condition_${p.id}`} checked={p.condition === "เสียชีวิต"} onChange={() => patchEntry("people", p.id, { condition: "เสียชีวิต" })}>เสียชีวิต</Choice>
    </div>
  </Row>
</Field>
                          <Field label="คำนำหน้า-ชื่อ-นามสกุล" basis="100%">
                            <NameRow
                              prefix={p.prefix} first={p.first} last={p.last}
                              onPrefix={(v) => patchEntry("people", p.id, { prefix: v })}
                              onFirst={(v) => patchEntry("people", p.id, { first: v })}
                              onLast={(v) => patchEntry("people", p.id, { last: v })}
                            />
                          </Field>
                          <Field label="สัญชาติ" basis="140">
                            <Select value={p.nationality} onChange={(e) => patchEntry("people", p.id, { nationality: e.target.value })}>
                              <option>ไทย</option><option>ต่างชาติ</option>
                            </Select>
                          </Field>
                          <Field label="เพศ" basis="140">
                            <Select value={p.gender} onChange={(e) => patchEntry("people", p.id, { gender: e.target.value })}>
                              <option>ชาย</option><option>หญิง</option><option>อื่นๆ</option>
                            </Select>
                          </Field>
                          <Field label="สถานะ" basis="140">
  <Select value={p.status} onChange={(e) => patchEntry("people", p.id, { status: e.target.value })}>
    <option>เจ้าหน้าที่</option><option>ประชาชน</option>
  </Select>
</Field>
                          <Field label="แนบภาพ" basis="100%">
                            <PhotoUploader small photos={p.photos} onAdd={(a) => patchEntry("people", p.id, { photos: [...p.photos, ...a] })} onRemove={(id) => patchEntry("people", p.id, { photos: p.photos.filter((x) => x.id !== id) })} />
                          </Field>
                        </Row>
                      </EntryShell>
                    ))}
                  </div>
                  <AddButton onClick={() => addEntry("people", { id: uid("p"), condition: "บาดเจ็บ", prefix: "นาย", first: "", last: "", nationality: "ไทย", gender: "ชาย", status: "เจ้าหน้าที่", photos: [] })}>
                    + เพิ่มรายชื่อผู้บาดเจ็บ/เสียชีวิต
                  </AddButton>
                </DamageCard>

                {/* 6b property */}
                <DamageCard icon={<HomeIcon size={16} />} title="ทรัพย์สินเสียหาย" skipped={data.skip.property} onSkip={(v) => setSkip("property", v)}>
                  <div className="flex flex-col gap-3 mb-3">
                    {data.properties.map((p, i) => (
                      <EntryShell key={p.id} tag={`รายการที่ ${i + 1}`} onRemove={() => removeEntry("properties", p.id)}>
                        <Row>
                          <Field label="รายการเสียหาย" basis="200">
  <AutocompleteInput
    value={p.item}
    placeholder="พิมพ์หรือเลือกรายการ..."
    items={[
        ...properties.map((it) => ({
            name: it.propertyName,
            aliases:
                typeof it.aliases === "string"
                    ? it.aliases
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : Array.isArray(it.aliases)
                    ? it.aliases
                    : []
        })),
        {
            name: "อื่นๆ",
            aliases: []
        }
    ]}
    onChange={(name, aliasNote) =>
        patchEntry(
            "properties",
            p.id,
            {
                item: name,
                itemAliasNote: aliasNote
            }
        )
    }
/>
  {p.itemAliasNote && (
    <p className="text-xs text-stone-400 mt-1.5">
      พิมพ์ "{p.itemAliasNote}" — ระบบบันทึกเป็นคำกลางว่า "{p.item}"
    </p>
  )}
</Field>
{p.item === "อื่นๆ" && (
  <Field label="ระบุรายการ" basis="200">
    <TextInput placeholder="พิมพ์ชื่อรายการ..." value={p.itemOther} onChange={(e) => patchEntry("properties", p.id, { itemOther: e.target.value })} />
  </Field>
)}
                          <Field label="ราคาประเมิน (บาท)" basis="160">
                            <TextInput type="number" min="0" placeholder="0" value={p.price} onChange={(e) => patchEntry("properties", p.id, { price: e.target.value })} />
                          </Field>
                          <Field label="คำนำหน้า-ชื่อ-นามสกุลผู้เสียหาย" basis="100%">
                            <NameRow
                              prefix={p.prefix} first={p.first} last={p.last}
                              onPrefix={(v) => patchEntry("properties", p.id, { prefix: v })}
                              onFirst={(v) => patchEntry("properties", p.id, { first: v })}
                              onLast={(v) => patchEntry("properties", p.id, { last: v })}
                            />
                          </Field>
                          <Field label="สถานะ" basis="140">
                            <Select value={p.status} onChange={(e) => patchEntry("properties", p.id, { status: e.target.value })}>
                              <option>เจ้าของ</option><option>ผู้เช่า</option>
                            </Select>
                          </Field>
                          <Field label="สัญชาติ" basis="140">
                            <Select value={p.nationality} onChange={(e) => patchEntry("properties", p.id, { nationality: e.target.value })}>
                              <option>ไทย</option><option>ต่างชาติ</option>
                            </Select>
                          </Field>
                          <Field label="แนบภาพ" basis="100%">
                            <PhotoUploader small photos={p.photos} onAdd={(a) => patchEntry("properties", p.id, { photos: [...p.photos, ...a] })} onRemove={(id) => patchEntry("properties", p.id, { photos: p.photos.filter((x) => x.id !== id) })} />
                          </Field>
                        </Row>
                      </EntryShell>
                    ))}
                  </div>
                  <AddButton onClick={() => addEntry("properties", { id: uid("pr"), item: "", itemOther: "", itemAliasNote: "", price: "", prefix: "นาย", first: "", last: "", status: "เจ้าของ", nationality: "ไทย", photos: [] })}>
                    + เพิ่มรายการทรัพย์สินเสียหาย
                  </AddButton>
                </DamageCard>

                {/* 6c crop */}
                <DamageCard icon={<Wheat size={16} />} title="พืชผลเสียหาย" skipped={data.skip.crop} onSkip={(v) => setSkip("crop", v)}>
                  <div className="flex flex-col gap-3 mb-3">
                    {data.crops.map((c, i) => (
                      <EntryShell key={c.id} tag={`รายการที่ ${i + 1}`} onRemove={() => removeEntry("crops", c.id)}>
                        <Field label="ประเภทพืช">
  <Row gap="0.6rem">
    {["พืชไร่/พืชสวน", "ไม้ผล", "ไม้ยืนต้น"].map((t) => (
      <div key={t} style={{ flex: "1 1 130px" }}>
        <Choice
  checked={c.type === t}
  onChange={() =>
    patchEntry("crops", c.id, {
      type: t,
      species: "",
      speciesOther: "",

      damageLevel:
        t === "ไม้ผล"
          ? "ลำต้นเสียหายสิ้นเชิง"
          : t === "ไม้ยืนต้น"
          ? "เสียหายโดยสิ้นเชิง"
          : "",

      farmArea:
        t === "พืชไร่/พืชสวน"
          ? "น้อยกว่า 20 ตารางเมตร"
          : "",

      rai: "",
      kg: ""
    })
  }
>{t}</Choice>
      </div>
    ))}
  </Row>
</Field>
<Row>
  <Field label="ชนิดพืช" basis="200">
    <Select value={c.species} onChange={(e) => patchEntry("crops", c.id, { species: e.target.value })}>
      <option value="">— เลือกชนิดพืช —</option>
      {crops
  .filter((x) => x.cropCategory === c.type)
  .map((x) => (
    <option
      key={x.cropId}
      value={x.cropName}
    >
      {x.cropName}
    </option>
))}
      <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
    </Select>
  </Field>
  {c.species === "อื่นๆ" && (
    <Field label="ระบุชนิดพืช" basis="200">
      <TextInput placeholder="พิมพ์ชนิดพืช..." value={c.speciesOther} onChange={(e) => patchEntry("crops", c.id, { speciesOther: e.target.value })} />
    </Field>
  )}
                          {c.type === "พืชไร่/พืชสวน" && (
                            <>
                              <Field label="พื้นที่เสียหาย" basis="180">
                                <Select value={c.farmArea} onChange={(e) => patchEntry("crops", c.id, { farmArea: e.target.value })}>
                                  <option>น้อยกว่า 20 ตารางเมตร</option><option>มากกว่า 20 ตารางเมตร</option>
                                </Select>
                              </Field>
                              <Field label="จำนวนตารางเมตร" basis="140" info="1 งาน = 400 ตารางเมตร, 1 ไร่ = 1,600 ตารางเมตร">
                                <TextInput type="number" min="0" placeholder="0" value={c.rai} onChange={(e) => patchEntry("crops", c.id, { rai: e.target.value })} />
                              </Field>
                            </>
                          )}
                          {c.type === "ไม้ผล" && (
                            <Field label="ลักษณะความเสียหาย" basis="200">
                              <Select
  value={c.damageLevel}
  onChange={(e) =>
    patchEntry("crops", c.id, {
      damageLevel: e.target.value,
      kg:
        e.target.value === "ผลผลิตเสียหาย"
          ? c.kg
          : ""
    })
  }
>
                                <option>ลำต้นเสียหายสิ้นเชิง</option><option>ผลผลิตเสียหาย</option>
                              </Select>
                            </Field>
                          )}
                          {c.type === "ไม้ผล" && c.damageLevel === "ผลผลิตเสียหาย" && (
                            <Field label="จำนวนผลผลิตเสียหาย (กก.)" basis="200">
                              <TextInput type="number" min="0" placeholder="0" value={c.kg} onChange={(e) => patchEntry("crops", c.id, { kg: e.target.value })} />
                            </Field>
                          )}
                          {c.type === "ไม้ยืนต้น" && (
                            <Field label="ลักษณะความเสียหาย" basis="200">
                              <TextInput value="เสียหายโดยสิ้นเชิง" disabled />
                            </Field>
                          )}
                          <Field label="คำนำหน้า-ชื่อ-นามสกุลผู้เสียหาย" basis="100%">
                            <NameRow
                              prefix={c.prefix} first={c.first} last={c.last}
                              onPrefix={(v) => patchEntry("crops", c.id, { prefix: v })}
                              onFirst={(v) => patchEntry("crops", c.id, { first: v })}
                              onLast={(v) => patchEntry("crops", c.id, { last: v })}
                            />
                          </Field>
                          <Field label="สถานะ" basis="140">
                            <Select value={c.status} onChange={(e) => patchEntry("crops", c.id, { status: e.target.value })}>
                              <option>เจ้าของ</option><option>ผู้เช่า</option>
                            </Select>
                          </Field>
                          <Field label="สัญชาติ" basis="140">
                            <Select value={c.nationality} onChange={(e) => patchEntry("crops", c.id, { nationality: e.target.value })}>
                              <option>ไทย</option><option>ต่างชาติ</option>
                            </Select>
                          </Field>
                          <Field label="แนบภาพ" basis="100%">
                            <PhotoUploader small photos={c.photos} onAdd={(a) => patchEntry("crops", c.id, { photos: [...c.photos, ...a] })} onRemove={(id) => patchEntry("crops", c.id, { photos: c.photos.filter((x) => x.id !== id) })} />
                          </Field>
                        </Row>
                      </EntryShell>
                    ))}
                  </div>
                  {/* <datalist id="cropSpeciesList">
                    {CROP_SPECIES.map((v) => <option key={v} value={v} />)}
                  </datalist> */}
                  <AddButton
                    onClick={() =>
                      addEntry("crops", {
                        id: uid("c"), type: "พืชไร่/พืชสวน", species: "", speciesOther: "", farmArea: "น้อยกว่า 20 ตารางเมตร", rai: "",
                        damageLevel: "", kg: "",
                        prefix: "นาย", first: "", last: "", status: "เจ้าของ", nationality: "ไทย", photos: [],
                      })
                    }
                  >
                    + เพิ่มรายการพืชผลเสียหาย
                  </AddButton>
                </DamageCard>

                {/* 6d elephant */}
                <DamageCard icon={<PawPrint size={16} />} title="ความเสียหายที่เกิดกับช้างป่า" skipped={data.skip.elephant} onSkip={(v) => setSkip("elephant", v)}>
                  <div className="flex flex-col gap-3 mb-3">
                    {data.elephantDamages.map((e, i) => (
                      <EntryShell key={e.id} tag={`รายการที่ ${i + 1}`} onRemove={() => removeEntry("elephantDamages", e.id)}>
                        <Field label="สถานะ">
                          <Row gap="0.6rem">
                            <div style={{ flex: "1 1 140px" }}>
                              <Choice checked={e.status === "ตาย"} onChange={() => patchEntry("elephantDamages", e.id, { status: "ตาย" })}>ตาย</Choice>
                            </div>
                            <div style={{ flex: "1 1 140px" }}>
                              <Choice checked={e.status === "บาดเจ็บ"} onChange={() => patchEntry("elephantDamages", e.id, { status: "บาดเจ็บ" })}>บาดเจ็บ</Choice>
                            </div>
                          </Row>
                        </Field>
                        <Row>
                          <Field label="จำนวน" basis="120">
                            <TextInput type="number" min="0" value={e.count} onChange={(ev) => patchEntry("elephantDamages", e.id, { count: ev.target.value })} />
                          </Field>
                          <Field label="เพศ" basis="150">
                            <Select value={e.gender} onChange={(ev) => patchEntry("elephantDamages", e.id, { gender: ev.target.value })}>
                              <option>ไม่ทราบ</option><option>ผู้</option><option>เมีย</option>
                            </Select>
                          </Field>
                          <Field label="ชื่อ" basis="160">
                            <TextInput placeholder="ชื่อช้าง (ถ้าทราบ)" value={e.name} onChange={(ev) => patchEntry("elephantDamages", e.id, { name: ev.target.value })} />
                          </Field>
                          <Field label="รหัสประจำตัว" basis="160">
                            <TextInput placeholder="รหัสประจำตัว (ถ้าทราบ)" value={e.code} onChange={(ev) => patchEntry("elephantDamages", e.id, { code: ev.target.value })} />
                          </Field>
                          {e.status === "ตาย" && (
  <>
    <Field label="สาเหตุการตาย" basis="200">
      <Select value={e.causeType} onChange={(ev) => patchEntry("elephantDamages", e.id, { causeType: ev.target.value })}>
        <option value="">— เลือกสาเหตุ —</option>
        <option value="ธรรมชาติ">ธรรมชาติ</option>
        <option value="มนุษย์">มนุษย์</option>
      </Select>
    </Field>
    <Field label="รายละเอียด" basis="200" info="การประเมินสาเหตุนี้เป็นข้อมูลเบื้องต้น จะไม่มีผลทางกฎหมายหรือถือเป็นความผิดหากมีความคลาดเคลื่อน">
      <TextInput placeholder="บรรยายสิ่งที่พบเห็น" value={e.cause} onChange={(ev) => patchEntry("elephantDamages", e.id, { cause: ev.target.value })} />
    </Field>
  </>
)}
                          <Field label="แนบภาพ" basis="100%">
                            <PhotoUploader small photos={e.photos} onAdd={(a) => patchEntry("elephantDamages", e.id, { photos: [...e.photos, ...a] })} onRemove={(id) => patchEntry("elephantDamages", e.id, { photos: e.photos.filter((x) => x.id !== id) })} />
                          </Field>
                        </Row>
                      </EntryShell>
                    ))}
                  </div>
                  <AddButton onClick={() => addEntry("elephantDamages", { id: uid("ed"), status: "ตาย", count: "1", gender: "ไม่ทราบ", name: "", code: "", causeType: "", cause: "", photos: [] })}>
                    + เพิ่มรายการช้างป่าที่ได้รับผลกระทบ
                  </AddButton>
                </DamageCard>
              </div>
            )}
          </section>
        )}

        {/* STEP 7 */}
        {step === 7 && (
          <section>
            <SectionHeader num={7} title="ผู้บันทึกรายงาน" desc="ข้อมูลผู้จัดทำรายงานฉบับนี้ เพื่อการติดต่อกลับหากข้อมูลไม่ครบถ้วน" />
            <Card>
              <Field label="คำนำหน้า-ชื่อ-นามสกุล" required>
                <NameRow
                  prefixes={RECORDER_PREFIXES}
                  prefix={data.recorderPrefix} first={data.recorderFirst} last={data.recorderLast}
                  onPrefix={(v) => set("recorderPrefix", v)}
                  onFirst={(v) => set("recorderFirst", v)}
                  onLast={(v) => set("recorderLast", v)}
                />
              </Field>
              <Row>
                <Field label="ตำแหน่ง" required basis="220">
  <Select
    value={data.recorderPos}
    onChange={(e) => set("recorderPos", Number(e.target.value))}
  >
    <option value="">— เลือกตำแหน่ง —</option>

    {positions
      .filter(position => position.status === "Active")
      .map(position => (
        <option
          key={position.positionId}
          value={position.positionId}
        >
          {position.positionName}
        </option>
      ))}
  </Select>
</Field>
                <Field label="หน่วยงาน" required basis="220">
  <TextInput
    list="officeList"
    placeholder="พิมพ์เพื่อค้นหาหน่วยงาน..."
    value={data.recorderOrg}
    onChange={(e) => set("recorderOrg", e.target.value)}
    autoComplete="off"
  />

  <datalist id="officeList">
    {forestAreas.map(area => (
      <option
        key={area.areaId}
        value={`${area.areaType}${area.areaName}`}
      />
    ))}
  </datalist>
</Field>
                <Field label="เบอร์โทรติดต่อ" required basis="220">
  <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base opacity-40 grayscale pointer-events-none select-none">🇹🇭</span>
    <TextInput
      placeholder="0XX XXX XXXX"
      value={formatPhoneTH(data.recorderPhone)}
      onChange={(e) => set("recorderPhone", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
      inputMode="numeric"
      className="pl-9"
    />
  </div>
</Field>
              </Row>
            </Card>
          </section>
        )}


        {/* NAV */}
      <div className="mt-6">
          {stepError && (
            <p className="text-sm text-rose-600 text-right mb-2">
              กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบก่อนดำเนินการต่อไป
            </p>
          )}
        <div className="flex justify-between items-center">
          <button
              type="button"
              onClick={() => goTo(step - 1)}
              className={"inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-2 border-stone-200 font-semibold text-sm hover:border-emerald-400 " + (step === 1 ? "invisible" : "")}
            >
            <ChevronLeft size={16} /> ย้อนกลับ
          </button>
          <span className="font-mono text-xs text-stone-400">ส่วนที่ {step} จาก 7</span>
          <button
            type="button"
            onClick={() => {
                if (!isStepValid(step)) {
                  setStepError(true);
                  return;
                }
                setStepError(false);
                if (step === 7) {
                  setShowConfirm(true);
                } else {
                  goTo(step + 1);
                }
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm"
            >
            {step === 7 ? (<><Check size={16} /> ส่งรายงาน</>) : (<>ถัดไป <ChevronRight size={16} /></>)}
          </button>
        </div>
      </div>
      </main>
      </div>
      {showConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-7 text-center">
      <div className="mx-auto w-14 h-14 rounded-full border-2 border-amber-500 flex items-center justify-center mb-4">
        <span className="text-amber-500 text-3xl font-bold leading-none">!</span>
      </div>
      <h3 className="text-lg font-bold text-stone-900 mb-2">ยืนยันการส่งรายงาน</h3>
      <p className="text-sm text-stone-500 mb-6 leading-relaxed">
        หลังกดยืนยัน ข้อมูลในรายงานจะไม่สามารถแก้ไขได้ โดยจะถือว่าข้อมูลผ่านการรับรองความถูกต้องจากหน่วยงานภาคสนามเรียบร้อยแล้ว
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg border-2 border-stone-200 font-semibold text-sm text-stone-700 hover:bg-stone-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={submitReport}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm flex items-center justify-center gap-2"
        >
          {submitting && (
    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white" style={{ animation: "spin 0.7s linear infinite" }} />
  )}
  {submitting
  ? (submitAttempt > 1
      ? `กำลังลองส่งใหม่ (${submitAttempt}/4)...`
      : "กำลังบันทึก...")
  : "ยืนยัน"}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center py-2.5 rounded-lg border-2 border-dashed border-emerald-500 text-emerald-800 font-semibold text-sm bg-white hover:bg-stone-50 flex items-center justify-center gap-1.5"
    >
      <Plus size={15} /> {children.replace(/^\+\s*/, "")}
    </button>
  );
}

function DamageCard({ icon, title, skipped, onSkip, children }) {
  return (
    <div className="border-2 border-stone-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 bg-stone-50 border-b-2 border-stone-200">
        <div className="font-semibold text-sm flex items-center gap-2">
          {icon} {title}
        </div>
        <Switch checked={skipped} onChange={(e) => onSkip(e.target.checked)} />
      </div>
      {skipped ? (
        <div className="px-5 py-4 text-sm text-stone-400 italic border-dashed">ข้ามความเสียหายประเภทนี้ — ไม่มีความเสียหาย</div>
      ) : (
        <div className="p-4 sm:p-5 bg-white">{children}</div>
      )}
    </div>
  );
}
