import { useState } from 'react';
import { Search, Pill, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

type Medicine = {
    name: string;
    generic: string;
    category: string;
    uses: string[];
    dose: string;
    warnings: string[];
    note?: string;
};

const MEDICINES: Medicine[] = [
    {
        name: 'Paracetamol (Crocin / Dolo)',
        generic: 'Acetaminophen',
        category: 'Pain Relief',
        uses: ['Period cramps', 'Headache', 'Fever', 'General pain'],
        dose: '500–1000 mg every 4–6 hours. Max 4000 mg/day.',
        warnings: ['Do not exceed daily dose', 'Avoid with alcohol', 'Check liver health if taking long-term'],
    },
    {
        name: 'Ibuprofen (Brufen / Advil)',
        generic: 'Ibuprofen',
        category: 'Pain Relief / Anti-inflammatory',
        uses: ['Period cramps (dysmenorrhea)', 'Inflammation', 'Headache', 'Muscle pain'],
        dose: '200–400 mg every 4–6 hours with food. Max 1200 mg/day OTC.',
        warnings: ['Take with food to protect stomach', 'Avoid if stomach ulcers', 'Not for kidney disease', 'Avoid in pregnancy (esp. 3rd trimester)'],
        note: 'Most effective for period pain when taken at first sign of cramps.',
    },
    {
        name: 'Mefenamic Acid (Meftal Spas)',
        generic: 'Mefenamic Acid',
        category: 'Period Pain',
        uses: ['Severe period cramps', 'Heavy menstrual bleeding', 'Dysmenorrhea'],
        dose: '250–500 mg 3 times a day with food. Start day before period.',
        warnings: ['Can cause stomach upset', 'Not for kidney/liver disease', 'Avoid in pregnancy', 'Not for more than 7 days continuously'],
        note: 'Specifically prescribed for period pain in India — very common.',
    },
    {
        name: 'Iron Supplement (Ferrous Sulfate)',
        generic: 'Ferrous Sulfate / Ferrous Fumarate',
        category: 'Nutritional Supplement',
        uses: ['Iron deficiency anemia', 'Heavy period blood loss', 'Fatigue due to low iron'],
        dose: '65 mg elemental iron, 1–3 times daily. Best on empty stomach.',
        warnings: ['Can cause constipation and dark stools (normal)', 'Take with Vitamin C for better absorption', 'Avoid with calcium-rich foods/tea within 2 hours'],
    },
    {
        name: 'Folic Acid (Vitamin B9)',
        generic: 'Folic Acid',
        category: 'Nutritional Supplement',
        uses: ['Pre-pregnancy planning', 'Anemia prevention', 'Neural tube defect prevention'],
        dose: '400 mcg/day for general health. 5 mg/day prescribed in pregnancy.',
        warnings: ['Generally very safe', 'High doses only under doctor advice', 'Needed before and during early pregnancy'],
    },
    {
        name: 'Combined Oral Contraceptive Pill',
        generic: 'Ethinyl Estradiol + Progestin',
        category: 'Hormonal / Contraceptive',
        uses: ['Contraception', 'Regulating periods', 'PCOS management', 'Reducing period pain', 'Acne'],
        dose: 'One pill daily at the same time. Start as prescribed by doctor.',
        warnings: ['Prescription required', 'May raise blood pressure', 'Increased clot risk in smokers over 35', 'Does NOT protect against STIs'],
        note: 'Multiple brands in India (Yasmin, Diane-35, Mala-N). Always get a doctor prescription.',
    },
    {
        name: 'Emergency Contraception (I-Pill)',
        generic: 'Levonorgestrel',
        category: 'Emergency Contraceptive',
        uses: ['Emergency contraception within 72 hours of unprotected sex'],
        dose: '1.5 mg single dose. The sooner, the more effective.',
        warnings: ['Not for regular contraception', 'May cause nausea, irregular bleeding', 'Less effective if overweight (>70 kg)', 'Does not protect against STIs or ongoing pregnancy'],
    },
    {
        name: 'Metformin',
        generic: 'Metformin Hydrochloride',
        category: 'PCOS / Diabetes',
        uses: ['PCOS insulin resistance', 'Irregular periods from PCOS', 'Type 2 diabetes'],
        dose: '500–2000 mg/day as prescribed. Always take with food.',
        warnings: ['Prescription required', 'Can cause stomach upset initially', 'Do not take if kidney disease', 'Regular follow-up needed'],
    },
    {
        name: 'Calcium + Vitamin D3',
        generic: 'Calcium Carbonate + Cholecalciferol',
        category: 'Nutritional Supplement',
        uses: ['Bone health', 'PMS symptoms reduction', 'Post-menopausal bone loss', 'Vitamin D deficiency'],
        dose: '500–1000 mg calcium + 400–1000 IU Vit D daily, with food.',
        warnings: ['Excess calcium can cause kidney stones', 'Space from iron supplements by 2 hours', 'Get blood levels checked if taking high doses'],
    },
    {
        name: 'Antispasmodic (Drotaverine / No-Spa)',
        generic: 'Drotaverine HCl',
        category: 'Period Cramp Relief',
        uses: ['Uterine spasms', 'Period cramps', 'Smooth muscle pain'],
        dose: '40–80 mg 2–3 times daily as needed.',
        warnings: ['Avoid in low blood pressure', 'May cause dizziness', 'Not for heart disease patients'],
        note: 'Often combined with mefenamic acid for period pain.',
    },
    {
        name: 'Probiotics (Lactobacillus)',
        generic: 'Lactobacillus acidophilus / rhamnosus',
        category: 'Vaginal & Gut Health',
        uses: ['Prevent UTIs', 'Maintain vaginal pH', 'After antibiotic use', 'Gut health'],
        dose: 'As per product instructions. Usually 1 capsule daily.',
        warnings: ['Generally safe', 'Consult doctor if immunocompromised', 'Refrigerate as instructed'],
    },
    {
        name: 'Antibiotic – Fluconazole',
        generic: 'Fluconazole',
        category: 'Antifungal',
        uses: ['Vaginal yeast infection (candidiasis)', 'Oral thrush'],
        dose: '150 mg single dose for vaginal yeast infection (doctor prescribed).',
        warnings: ['Prescription required', 'Avoid in pregnancy (first trimester)', 'Can interact with many other drugs', 'If recurrent, needs investigation'],
    },
    {
        name: 'Vitamin B12 (Methylcobalamin)',
        generic: 'Methylcobalamin',
        category: 'Nutritional Supplement',
        uses: ['Fatigue', 'Nerve health', 'Anemia', 'Vegetarian / vegan women at risk'],
        dose: '500–1500 mcg/day oral. Injection form prescribed for severe deficiency.',
        warnings: ['Generally very safe', 'High doses rarely cause issues', 'Get blood test to confirm deficiency if fatigued'],
    },
    {
        name: 'Clomiphene (Clomid)',
        generic: 'Clomiphene Citrate',
        category: 'Fertility',
        uses: ['Inducing ovulation', 'PCOS-related infertility', 'Irregular ovulation'],
        dose: '50–100 mg for 5 days in a cycle. Strictly as prescribed.',
        warnings: ['Prescription only', 'Can cause multiple pregnancies', 'Regular ultrasound monitoring needed', 'Not for long-term use'],
    },
    {
        name: 'Thyroid Supplement (Levothyroxine)',
        generic: 'Levothyroxine Sodium',
        category: 'Thyroid / Hormonal',
        uses: ['Hypothyroidism', 'Irregular periods from thyroid issues', 'Fatigue', 'Hair loss'],
        dose: 'As prescribed based on TSH blood test. Take on empty stomach.',
        warnings: ['Never self-medicate — dose is individual', 'Take consistently at same time', 'Many drug interactions', 'Blood test every 6 months'],
    },
];

const CATEGORIES = ['All', ...Array.from(new Set(MEDICINES.map(m => m.category)))];

export default function MedicineLibrary() {
    const [search, setSearch] = useState('');
    const [cat, setCat] = useState('All');
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = MEDICINES.filter(m => {
        const q = search.toLowerCase();
        const matchSearch = !q || m.name.toLowerCase().includes(q) || m.generic.toLowerCase().includes(q) || m.uses.some(u => u.toLowerCase().includes(q));
        const matchCat = cat === 'All' || m.category === cat;
        return matchSearch && matchCat;
    });

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
                <Pill className="text-primary" size={28} />
                <h1 className="text-2xl font-semibold">Medicine Library</h1>
            </div>
            <p className="text-ink/70 mb-4">General information about common medicines for women's health. Always consult a doctor before taking any medication.</p>

            {/* Disclaimer */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-6 flex gap-2 text-sm text-amber-800">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span><strong>Not a prescription.</strong> This is general information only. Dosages and safety depend on your individual health. Always ask your doctor or pharmacist before starting any medicine.</span>
            </div>

            {/* Search + filter */}
            <div className="card mb-6 flex flex-col gap-3">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, ingredient or use…"
                        className="input pl-9" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCat(c)}
                            className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${cat === c ? 'bg-primary text-white' : 'bg-soft text-primary hover:bg-lavender/30'}`}>
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-ink/60 mb-4">{filtered.length} medicine{filtered.length !== 1 ? 's' : ''} found</p>

            {/* Medicine cards */}
            <div className="space-y-3">
                {filtered.length === 0 && (
                    <div className="card text-center py-10 text-ink/50">
                        <Pill size={36} className="mx-auto mb-3 text-lavender" />
                        <p>No medicines match your search.</p>
                    </div>
                )}
                {filtered.map(m => {
                    const isOpen = expanded === m.name;
                    return (
                        <div key={m.name} className="card cursor-pointer hover:border-lavender transition-all"
                            onClick={() => setExpanded(isOpen ? null : m.name)}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold text-base">{m.name}</h2>
                                        <span className="rounded-full bg-soft px-2 py-0.5 text-xs text-primary">{m.category}</span>
                                    </div>
                                    <p className="text-sm text-ink/60 mt-0.5">{m.generic}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {m.uses.slice(0, 3).map(u => (
                                            <span key={u} className="rounded-full bg-blush px-2 py-0.5 text-xs text-primary">{u}</span>
                                        ))}
                                        {m.uses.length > 3 && <span className="text-xs text-ink/50">+{m.uses.length - 3} more</span>}
                                    </div>
                                </div>
                                <button className="text-ink/40 shrink-0 mt-1">
                                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>

                            {isOpen && (
                                <div className="mt-4 space-y-3 border-t border-soft pt-4">
                                    <div>
                                        <p className="text-sm font-semibold flex items-center gap-1 mb-1"><Info size={14} className="text-primary" />Typical Dose</p>
                                        <p className="text-sm text-ink/80 bg-soft rounded-lg px-3 py-2">{m.dose}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold flex items-center gap-1 mb-1"><AlertTriangle size={14} className="text-amber-500" />Warnings</p>
                                        <ul className="text-sm text-ink/80 space-y-1">
                                            {m.warnings.map(w => <li key={w} className="flex gap-2"><span className="text-amber-400 shrink-0">•</span>{w}</li>)}
                                        </ul>
                                    </div>
                                    {m.note && (
                                        <div className="rounded-xl bg-lavender/20 px-3 py-2 text-sm text-primary">
                                            💡 {m.note}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
