"use client";

import Link from "next/link";
import React from "react";
import { HeartIcon, SearchIcon, ShoppingCartIcon, UserIcon } from "lucide-react";
import HeaderBottom from "./HeaderBottom";
import useUser from "@/hooks/useUser";

const Header = () => {
  const { user, isLoading } = useUser();

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
             <SearchIcon color="white" />
          </div>
        </div>
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
            {!isLoading && user ? (
              <>
                <div className="relative">
                  <Link
                    href={"/"}
                    className="border-2 w-[50px] relative h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                  >
                    <UserIcon />
                  </Link>
                </div>
                <Link href={"/profile"}>
                  <span className="block font-medium">Hello,</span>
                  <span className="font-semibold">
                    {user?.name}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={"/login"}
                  className="border-2 w-[50px] h-[50px] flex items-center justify-center rounded-full border-[#010f1c1a]"
                >
                  <UserIcon />
                </Link>
                <Link href={"/login"}>
                  <span className="block font-medium">Hello,</span>
                  <span className="font-semibold">
                    {isLoading ? "..." : "Sign In"}
                  </span>
                </Link>
              </>
            )}
            </div>
            <div className="flex items-center gap-5">
                <Link href={"/wishlist"} className="relative">
                    <HeartIcon/>
                    <div className="size-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] end-[-10px]">
                         <span className="font-medium text-sm text-white">0</span>
                    </div>
                </Link>
                <Link href={"/cart"} className="relative">
                    <ShoppingCartIcon/>
                    <div className="size-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] end-[-10px]">
                         <span className="font-medium text-sm text-white">0 </span>
                    </div>
                </Link>
            </div>
        </div>
      </div>
      <div className="border-b border-b-[#99999938]"></div>
      <HeaderBottom />
    </div>
  );
};

export default Header;
