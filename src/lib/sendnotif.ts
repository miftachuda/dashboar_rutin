import { pb } from "./pocketbase";
export interface EventPayload {
  title: string;
  page: string;
  message: string;
  action?: string;
  collection?: string;
  record_id?: string;
}

export async function sendNotif(data: EventPayload) {
  try {
    const record = await pb.collection("notifications").create({
      title: data.title,
      page: data.page,
      message: data.message,
      action: data.action || "",
      collection: data.collection || "",
      record_id: data.record_id || "",
    });

    return record;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return undefined;
  }
}
