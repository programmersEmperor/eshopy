"use client";

import { NAV_ITEMS } from "@/config/constant";
import { AlignLeftIcon, ChevronDownIcon, HeartIcon, UserIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { twMerge } from 'tailwind-merge'

const HeaderBottom = () => {
    const [show, setShow] = useState(false);
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 100);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
     }, []);
    
    return (
        <div className={twMerge("w-full transition-all duration-300 ", isSticky ? "fixed top-0 start-0 z-50 bg-white shadow-lg": "relative")}>
            <div className={twMerge("w-[80%] relative m-auto flex items-center justify-between", isSticky ? "pt-3" : "py-0")}>
                <button className={twMerge('w-[260px] cursor-pointer flex items-center justify-between px-5 h-[50px] bg-[#3489FF]', isSticky && '-mb-2')} onClick={() => setShow((prev) => !prev)}>
                    <div className="flex items-center gap-2">
                        <AlignLeftIcon color="white" />
                        <span className="font-medium text-white">All Departments</span>
                    </div>
                    <ChevronDownIcon color="white" />
                </button>
                
                {show && (
                    <div className={twMerge("absolute start-0 w-[260px] h-[400px] bg-[#f5f5f5] transition-all duration-300", isSticky ? "top-[70px]" : "top-[50px]")}>
                        
                    </div>
                )}

                <div className="flex items-center">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href} className="px-5 font-medium">
                            {item.title}
                        </Link>
                    ))}
                </div>

                {isSticky && 
                    (<div className="flex items-center gap-8 pb-2">
                        <div className="flex items-center gap-2">
                            <Link href={"/login"} 
                            className="border-2 size-[50px] flex items-center justify-center border-[#010f1c1a] rounded-full">
                                <UserIcon/>  
                            </Link>
                            <Link href={"/login"}>
                                <span className="block font-medium">Hello, </span>
                                <span className="font-semibold">Sign in</span>
                            </Link>
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
                    </div>)
                }
            </div>
        </div>
    );
};

export default HeaderBottom;