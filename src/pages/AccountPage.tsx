import React, { useEffect, useState } from "react";
import "react-image-gallery/styles/image-gallery.css";

import { pb } from "@/lib/pocketbase";
import DashboardLayout from "@/components/MainLayout";

const AccountPage: React.FC = () => {
  useEffect(() => {}, []);

  return (
    <DashboardLayout>
      <div className="p-6 w-full flex flex-col items-center justify-center"></div>
    </DashboardLayout>
  );
};

export default AccountPage;
