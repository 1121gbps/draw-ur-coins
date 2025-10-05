import Image from 'next/image'

type CoinProps = {
  src: string;
  name: string;
  size?: number;
  showName?: boolean;
};

export default function Coin({ src, name, size = 200, showName = true }: CoinProps) {
  return (
    <div className="flex flex-col justify-center items-center">
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className='rounded-full'
        style={{
          objectFit: "contain",
        }}
      ></Image>
      {showName && <p className="mt-2 font-semibold">{name}</p>}
    </div>
  );
}
