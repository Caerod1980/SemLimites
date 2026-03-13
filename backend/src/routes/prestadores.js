// ========== ATUALIZAR PERFIL DO PRESTADOR ==========
router.put('/perfil', autenticar, async (req, res) => {
  try {
    console.log('📝 Atualizando perfil do usuário:', req.user.userId);

    const user = await User.findById(req.user.userId);
    
    if (!user || user.tipo !== 'prestador' || !user.prestadorId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!req.body.nome || !req.body.categoria || !req.body.cidade || !req.body.estado || !req.body.whatsapp) {
      return res.status(400).json({ 
        error: 'Nome, categoria, cidade, estado e WhatsApp são obrigatórios' 
      });
    }

    const especialidades = req.body.especialidades 
      ? (Array.isArray(req.body.especialidades) 
          ? req.body.especialidades 
          : req.body.especialidades.split(',').map(e => e.trim()).filter(e => e))
      : [];

    const certificacoes = req.body.certificacoes 
      ? (Array.isArray(req.body.certificacoes) 
          ? req.body.certificacoes 
          : req.body.certificacoes.split(',').map(c => c.trim()).filter(c => c))
      : [];

    const regioesAtendimento = req.body.regioesAtendimento 
      ? (Array.isArray(req.body.regioesAtendimento) 
          ? req.body.regioesAtendimento 
          : req.body.regioesAtendimento.split(',').map(r => r.trim()).filter(r => r))
      : [];

    const tags = req.body.tags 
      ? (Array.isArray(req.body.tags) 
          ? req.body.tags 
          : req.body.tags.split(',').map(t => t.trim()).filter(t => t))
      : [];

    // Buscar prestador atual para saber o tipoPessoa
    const prestadorAtual = await Prestador.findById(user.prestadorId);
    
    const dadosAtualizados = {
      nome: req.body.nome,
      descricao: req.body.descricao || '',
      experiencia: req.body.experiencia || '',
      especialidades: especialidades,
      certificacoes: certificacoes,
      regioesAtendimento: regioesAtendimento,
      whatsapp: req.body.whatsapp.replace(/\D/g, ''),
      telefone: req.body.telefone ? req.body.telefone.replace(/\D/g, '') : '',
      cidade: req.body.cidade,
      estado: req.body.estado,
      categoria: req.body.categoria,
      tags: tags,
      
      // Campos específicos (se vierem no req.body)
      ...(req.body.cpf && { cpf: req.body.cpf.replace(/\D/g, '') }),
      ...(req.body.responsavel && { responsavel: req.body.responsavel }),
      ...(req.body.tipoPessoa && { tipoPessoa: req.body.tipoPessoa })
    };

    const prestador = await Prestador.findByIdAndUpdate(
      user.prestadorId,
      dadosAtualizados,
      { new: true, runValidators: true }
    );

    if (!prestador) {
      return res.status(404).json({ error: 'Prestador não encontrado' });
    }

    console.log(`✅ Perfil atualizado: ${prestador.nome}`);

    res.json({
      message: '✅ Perfil atualizado com sucesso!',
      prestador
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});
