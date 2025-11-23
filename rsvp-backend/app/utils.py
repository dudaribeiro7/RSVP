def normalize_name(name: str) -> str:
    """
    Normaliza nomes deixando cada palavra com inicial maiúscula
    e restante minúsculo.
    Ex: 'mARIA eduARDA FAcio' -> 'Maria Eduarda Facio'
    """
    if not name:
        return name

    return " ".join(word.capitalize() for word in name.split())
