// Pure data now lives in provinces.json / districts.json / subdistricts.json —
// one row per province/district/subdistrict, each with a plain id (and a
// parent id for districts/subdistricts) so it maps 1:1 onto Google Sheet tabs
// (Provinces, Districts, Subdistricts) if this ever moves to a live API/DB.
// This file only reshapes that data into the lookups the form needs; edit the
// JSON files, not this one, to update the real data.
import provinces from "./provinces.json";
import districts from "./districts.json";
import subdistricts from "./subdistricts.json";

export const PROVINCES = provinces;

export function districtsOfProvince(provinceId) {
  return districts.filter((d) => d.provinceId === provinceId);
}
export function subdistrictsOfDistrict(districtId) {
  return subdistricts.filter((s) => s.districtId === districtId);
}
export function findProvinceByName(name) {
  return provinces.find((p) => p.name === name) || null;
}
export function findDistrictByName(name, provinceId) {
  return districts.find((d) => d.name === name && (provinceId == null || d.provinceId === provinceId)) || null;
}
export function findSubdistrictByName(name, districtId) {
  return subdistricts.find((s) => s.name === name && (districtId == null || s.districtId === districtId)) || null;
}
