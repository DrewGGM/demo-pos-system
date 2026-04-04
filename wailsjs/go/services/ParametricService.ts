export async function GetDepartments() { return [{ id: 63, name: 'Quindío', code: '63' }]; }
export async function GetMunicipalitiesByDepartment(_deptId: number) { return [{ id: 820, name: 'Armenia', code: '63001' }]; }
export async function GetTypeLiabilities() { return [{ id: 117, name: 'No responsable', code: 'R-99-PN' }]; }
export async function GetTypeOrganizations() { return [{ id: 1, name: 'Persona Jurídica', code: '1' }, { id: 2, name: 'Persona Natural', code: '2' }]; }
export async function GetTypeRegimes() { return [{ id: 1, name: 'Responsable de IVA', code: '48' }, { id: 2, name: 'No Responsable de IVA', code: '49' }]; }
export async function GetTypeDocumentIdentifications() { return [{ id: 3, name: 'Cédula de ciudadanía', code: '13' }, { id: 6, name: 'NIT', code: '31' }]; }
export async function GetTaxTypes() { return [{ id: 1, name: 'IVA 19%', rate: 19 }, { id: 5, name: 'IVA 0%', rate: 0 }, { id: 6, name: 'IVA 5%', rate: 5 }]; }
export async function GetUnitMeasures() { return [{ id: 70, name: 'Unidad' }, { id: 796, name: 'Porción' }]; }
