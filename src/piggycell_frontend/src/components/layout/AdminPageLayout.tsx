import React from "react";

interface AdminPageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  children,
  title,
}) => {
  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="p-0 m-0 text-4xl font-extrabold leading-tight text-sky-600">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
};
