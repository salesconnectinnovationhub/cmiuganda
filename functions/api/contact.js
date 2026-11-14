import { readFormData, response, sanitize, sendEmail } from "../_shared/email.js";

const fields = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  message: "Message",
};

export async function onRequestPost({ request, env }) {
  const respond = (message, status, title) =>
    response(message, status, title, request.headers.get("Accept") || "");
  const parsed = await readFormData(request);
  if (parsed.error) return parsed.error;
  const { formData } = parsed;

  if (sanitize(formData.get("bot-field")) || sanitize(formData.get("website"))) {
    return respond("Your message has been received.", 200);
  }

  const values = {};
  for (const [field, label] of Object.entries(fields)) {
    const value = sanitize(formData.get(field));
    if (!value) {
      return respond(`${label} is required. Please return to the form and complete it.`, 400);
    }
    const maxLength = field === "message" ? 5000 : 1000;
    if (value.length > maxLength) {
      return respond(`${label} is too long. Please shorten it and try again.`, 400);
    }
    values[field] = value;
  }

  if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return respond("Enter a valid email address so CMI Group can respond to your message.", 400);
  }

  const enquiryTypes = {
    "home-enquiry": "Homepage consultation enquiry",
    "contact-enquiry": "Contact page enquiry",
    "service-enquiry": "Service consultation enquiry",
    "project-enquiry": "Project consultation enquiry",
    "property-enquiry": "Property consultation enquiry",
  };
  const enquiryType = enquiryTypes[sanitize(formData.get("form-name"))] || "Website enquiry";
  const delivery = await sendEmail(env, {
    replyTo: values.email,
    subject: `${enquiryType} from ${values.firstName} ${values.lastName}`,
    text: [
      `Enquiry type: ${enquiryType}`,
      `Name: ${values.firstName} ${values.lastName}`,
      `Email: ${values.email}`,
      `Phone: ${values.phone}`,
      "",
      "Message:",
      values.message,
    ].join("\n"),
  });

  if (delivery.status !== 200) {
    return respond("We could not send your message just now. Please try again or contact CMI Group directly.", delivery.status);
  }

  return respond("Your enquiry was accepted for delivery to CMI Group.", 200);
}
