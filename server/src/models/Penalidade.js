import mongoose from "mongoose";

const PenalidadeSchema = new mongoose.Schema({
  penalidade_id: { type: String, unique: true, default: null },
  nome: { type: String, required: true },
  equipe_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipe" },          // equipe mestre (opcional)
  equipe_gincana_id: { type: mongoose.Schema.Types.ObjectId, ref: "EquipeGincana", required: true },
  participante_id: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  pontos_removidos: { type: Number, required: true, default: 1 },
  descricao: { type: String, default: "" },
  criado_em: { type: Date, default: Date.now },
});

PenalidadeSchema.pre("save", function (next) {
  if (!this.penalidade_id) {
    const d = new Date();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    this.penalidade_id = `PEN-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${rnd}`;
  }
  next();
});

export default mongoose.model("Penalidade", PenalidadeSchema, "Penalidades")