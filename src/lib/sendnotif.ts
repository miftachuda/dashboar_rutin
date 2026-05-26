import { pb } from "./pocketbase";
export interface EventPayload {
  title: string;
  page: string;
  message: string;
}

export async function sendNotif(data: EventPayload) {
  try {
    const record = await pb.collection("events").create({
      title: data.title,
      page: data.page,
      message: data.message,
    });

    return record;
  } catch (error) {
    console.error("Failed to create event:", error);
    throw error;
  }
}
