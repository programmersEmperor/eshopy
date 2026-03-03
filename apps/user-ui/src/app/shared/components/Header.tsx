import Link from "next/link";
import React from "react";

const Header = () => {
  return (
    <div className="w-full bg-white">
      <div className="w-[80%] py-5 m-auto flex items-center justify-between">
        <div>
          <Link href={"/"}>
            <span className="text-2xl font-[500]">Eshopy</span>
          </Link>
        </div>
        <div className="w-[50%] relative">
          <input
            type="text"
            placeholder="Search for products ..."
            className="w-full px-4 py-2 font-poppins font-medium border-[2.5px] border-[#3489FF] outline-none h-[55px]"
          />
          <div className="w-[68px] h-[55px] cursor-pointer flex items-center justify-center bg-[#3489FF] absolute  top-0 end-0">
             
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
