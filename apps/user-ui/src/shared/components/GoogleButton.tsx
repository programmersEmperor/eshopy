import Image from "next/image";

const GoogleButton = () => {
  return (
    <button
      type="button"
      className="w-full h-12 cursor-pointer flex items-center justify-center gap-3 px-4 rounded-md border border-[#747775] bg-white hover:bg-[#f8f9fa] active:bg-[#f1f3f4] transition-colors my-2"
      aria-label="Sign in with Google"
    >
      <Image
        src="/google.svg"
        alt="Google"
        width={20}
        height={20}
        className="shrink-0"
      />
      <span className="font-roboto font-medium text-sm leading-5 text-[#1F1F1F]">
        Sign in with Google
      </span>
    </button>
  );
};

export default GoogleButton;