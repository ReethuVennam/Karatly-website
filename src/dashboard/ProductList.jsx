import { Coins } from "lucide-react";

const products = [
  "1 Gram Gold",
  "5 Gram Gold",
  "10 Gram Gold",
  "25 Gram Gold",
  "50 Gram Gold"
];

function ProductList({ setActiveTab }) {

  return (

    <div className="w-64 bg-[#0b0b0b] border-r border-white/10 p-6 space-y-4">

      <h3 className="text-yellow-400 font-semibold mb-4">
        Gold Products
      </h3>

      {products.map((product,index)=>(
        
        <button
          key={index}
          onClick={()=>setActiveTab("buy")}
          className="flex items-center gap-3 w-full p-3 rounded-lg bg-[#111] hover:bg-yellow-400 hover:text-black transition"
        >

          <Coins size={18}/>

          {product}

        </button>

      ))}

    </div>

  );

}

export default ProductList;