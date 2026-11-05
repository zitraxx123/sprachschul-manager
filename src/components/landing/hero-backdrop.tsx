/** Soft blurred colour blobs behind the hero (blue, teal, violet). CSS-animated on the compositor, no JS per frame. */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#635BFF]/25 blur-3xl will-change-transform animate-drift-a motion-reduce:animate-none dark:bg-[#635BFF]/30" />
      <div className="absolute -top-24 right-0 h-[26rem] w-[26rem] rounded-full bg-[#00C2FF]/25 blur-3xl will-change-transform animate-drift-b motion-reduce:animate-none dark:bg-[#00C2FF]/20" />
      <div className="absolute top-72 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#2DD4BF]/20 blur-3xl will-change-transform animate-drift-a motion-reduce:animate-none dark:bg-[#2DD4BF]/15" />
      <div className="absolute top-40 right-1/4 h-[20rem] w-[20rem] rounded-full bg-[#A78BFA]/25 blur-3xl will-change-transform animate-drift-b motion-reduce:animate-none dark:bg-[#A78BFA]/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F6F9FC] dark:from-[#0A1220] to-transparent" />
    </div>
  );
}
