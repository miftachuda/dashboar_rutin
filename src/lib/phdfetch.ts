export interface GetDataParams {
  startTime: string;
  endTime: string;
  interval: number;
  tagName: string[];
}

export async function fetchPHDData({
  startTime,
  endTime,
  interval,
  tagName,
}: GetDataParams): Promise<any> {
  const postData = [
    {
      SampleInterval: interval,
      GetEnum: false,
      ResampleMethod: "snapshot",
      MinimumConfidence: 40,
      MaxRows: 50000,
      TimeFormat: 6,
      ReductionData: "snapshot",
      TagName: tagName,
      StartTime: startTime,
      EndTime: endTime,
      OutputTimeFormat: 6,
      EventSequence: 0,
    },
  ];

  try {
    const response = await fetch("https://apiv2.miftachuda.my.id/GetData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching PHD data:", error);
    throw error;
  }
}
