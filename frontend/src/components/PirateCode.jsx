import { motion } from "framer-motion";
import { useLang, fmtPower } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1];
const COINS_IMG = "/img/code-pieces.jpg";

export default function PirateCode() {
  const { c } = useLang();
  const s = c.code;
  return (
    <section id="code" data-testid="code-section" className="relative py-24 md:py-32 bg-deep/40 map-grid border-y border-gold/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-end mb-14 md:mb-20">
          <div className="lg:col-span-8">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-mono2 text-[11px] tracking-[0.35em] text-gold mb-5 uppercase"
            >
              {s.eyebrow}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
              data-testid="code-title"
              className="font-display text-4xl sm:text-5xl lg:text-6xl text-bone leading-[1.02] uppercase"
            >
              {s.title1}<span className="text-gold">{s.titleGold}</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
              className="font-fell italic text-lg text-bone/75 mt-5 max-w-2xl"
            >
              {s.sub}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
            className="lg:col-span-4 hidden lg:block"
          >
            <div className="relative frame-plate border border-gold/25 p-2 bg-ink rotate-2 hover:rotate-0 transition-transform duration-700">
              <img src={COINS_IMG} alt={s.imgAlt} loading="lazy" className="w-full h-52 object-cover" />
              <p className="font-mono2 text-[10px] tracking-[0.3em] text-mist px-2 py-3">{s.imgCaption}</p>
            </div>
          </motion.div>
        </div>

        <div className="border-t border-gold/15">
          {s.articles.map((a, i) => (
            <motion.article
              key={a.num}
              data-testid={`code-article-${i + 1}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.06 }}
              className="group grid grid-cols-12 gap-3 sm:gap-6 items-start py-7 md:py-9 border-b border-gold/15 hover:bg-gold/[0.04] transition-colors duration-300 px-2 sm:px-4"
            >
              <span className="col-span-2 sm:col-span-1">
                <span className="wax-seal grid place-items-center w-11 h-11 sm:w-14 sm:h-14 font-decor text-sm sm:text-base text-goldlight transition-transform duration-500 group-hover:rotate-[-10deg]">
                  {a.num}
                </span>
              </span>
              <div className="col-span-10 sm:col-span-6">
                <h3 className="font-decor text-lg sm:text-2xl text-bone mb-2 tracking-wide">{a.title}</h3>
                <p className="font-fell text-base text-bone/70 leading-relaxed max-w-xl">{fmtPower(a.text)}</p>
              </div>
              <div className="col-span-12 sm:col-span-5 sm:text-right sm:pl-6">
                <span className="font-display text-xl sm:text-2xl text-goldlight block mb-2">{fmtPower(a.value)}</span>
                <span
                  className={`inline-block border px-3 py-1 font-mono2 text-[9px] sm:text-[10px] tracking-[0.3em] ${
                    ["OBLIGATOIRE", "REQUIRED", "STRATÉGIQUE", "STRATEGIC"].includes(a.tag)
                      ? "border-blood text-bloodglow"
                      : "border-gold/60 text-gold"
                  }`}
                >
                  {a.tag}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
