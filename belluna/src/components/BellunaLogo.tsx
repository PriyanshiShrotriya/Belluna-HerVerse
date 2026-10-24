type BellunaLogoProps = {
    size?: number;
    className?: string;
};

export default function BellunaLogo({
    size = 180,
    className = "",
}: BellunaLogoProps) {
    return (
        <img
            src="/assets/belluna-logo.png"
            alt="Belluna - Your Health, Your Voice, Our Support"
            className={`object-contain ${className}`}
            style={{
                width: size,
                height: "auto",
            }}
        />
    );
}
