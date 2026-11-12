import { readFormData, response, sanitize, sendEmail } from "../_shared/email.js";
const MAX_FIELD_LENGTH = 1000;

const fieldLabels = {
  fullname: "Full name",
  email: "Email",
  phone: "Phone",
  currentAddress: "Current address",
  countryCode: "Country code",
  whatsappNo: "WhatsApp number",
  mobilePhone: "Mobile phone",
  homePhone: "Home phone",
  homeCountry: "Home country",
  homeDistrict: "Home district",
  projectCountry: "Project country",
  projectDistrict: "Project district",
  anotherService: "Other requested service",
};

const checkboxLabels = {
  buildResidentialHouse: "Build residential house",
  buildCommercialHouse: "Build commercial house",
  roofing: "Roofing",
  flooring: "Flooring",
  tiling: "Tiling",
  terrazzo: "Terrazzo",
  furnitureFittings: "Furniture fittings",
  buyingLand: "Buying land",
  landSurveying: "Land surveying",
  landPlotting: "Land plotting",
  landTitle: "Land title",
  buildingPlans: "Building plans",
  architectureDrawings: "Architecture drawings",
  billsOfQuantities: "Bills of quantities",
  supplyBuildingMaterials: "Supply building materials",
  securityAlarms: "Security alarms",
  homeCameras: "Home cameras",
  airConditions: "Air conditioning",
  compoundDesigning: "Compound designing",
  interiorDesigning: "Interior designing",
  wallPainting: "Wall painting",
  secureSafeBoxBuilding: "Secure safe box building",
  warehouseBuilding: "Warehouse building",
  washingBay: "Washing bay",
  openBarDesigning: "Open bar designing",
  parkingLot: "Parking lot",
};

const requiredFields = [
  "fullname",
  "email",
  "phone",
  "currentAddress",
  "countryCode",
  "whatsappNo",
  "mobilePhone",
  "homePhone",
  "homeCountry",
  "homeDistrict",
  "projectCountry",
];

export async function onRequestPost({ request, env }) {
  const respond = (message, status, title) =>
    response(message, status, title, request.headers.get("Accept") || "");
  const parsed = await readFormData(request);
  if (parsed.error) return parsed.error;
  const { formData } = parsed;

  if (sanitize(formData.get("website"))) {
    return respond("Your interest has been received.", 200, "CMI Group expression of interest");
  }

  const values = {};
  for (const [field, label] of Object.entries(fieldLabels)) {
    const value = sanitize(formData.get(field));
    if (value.length > MAX_FIELD_LENGTH) {
      return respond(`${label} is too long. Please shorten it and try again.`, 400);
    }
    values[field] = value;
  }

  for (const field of requiredFields) {
    if (!values[field]) {
      return respond(`${fieldLabels[field]} is required. Please return to the form and complete it.`, 400);
    }
  }

  if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return respond("Enter a valid email address so CMI Group can respond to your enquiry.", 400);
  }

  const lines = Object.entries(fieldLabels).map(([field, label]) => `${label}: ${values[field] || "Not provided"}`);
  lines.push("", "Requested services:");
  for (const [field, label] of Object.entries(checkboxLabels)) {
    if (formData.get(field) === "on") lines.push(`- ${label}`);
  }
  lines.push(`- Other requested service: ${values.anotherService || "None"}`);

  const delivery = await sendEmail(env, {
    replyTo: values.email,
    subject: "New expression of interest",
    text: lines.join("\n"),
  });
  if (delivery.status !== 200) {
    return respond("We could not send your interest just now. Please try again or contact CMI Group directly.", delivery.status, "CMI Group expression of interest");
  }

  return respond("Your interest has been sent to CMI Group. We will be in touch using the contact details you provided.", 200, "CMI Group expression of interest");
}
