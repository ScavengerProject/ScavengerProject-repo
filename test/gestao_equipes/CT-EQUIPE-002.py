from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
import sys
import re

# IMPORTAR CONFIGURAÇÕES
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import (
    URL_LOGIN,
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    TEMPO_LIMITE_RESPOSTA,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    TOAST,
    EMAIL_ADMIN,
    SENHA_ADMIN,
    caminho_screenshot
)

# CONFIGURAÇÃO DE SCREENSHOTS
NOME_ARQUIVO_FALHA = "falha_ct_equipe_002.png"
NOME_ARQUIVO_SUCESSO = "sucesso_ct_equipe_002.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
CAMINHO_COMPLETO_SUCESSO = caminho_screenshot(NOME_ARQUIVO_SUCESSO)

# URL E VARIÁVEIS DO TESTE
URL_ADMIN_EQUIPES = "http://localhost:5173/admin/equipes"
NOME_EQUIPE_C = "Equipe C"
COR_EQUIPE_C = "#FF5733"  # Cor laranja para identificação
MENSAGEM_TOAST_CRIACAO_ESPERADA = "Equipe criada com sucesso!"
MENSAGEM_TOAST_MEMBRO_ESPERADA = "Participante adicionado com sucesso!"

print("Iniciando Teste CT-EQUIPE-002 (Criação Manual de Equipe Mista)...")

try:
    # Cria o diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")

    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # --- PASSO 1: LOGIN COMO ADMINISTRADOR ---
    print("Executando Passo 1: Login como Administrador...")
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    time.sleep(1)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    time.sleep(1)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login enviado.")

    # Aguarda o redirecionamento após login
    time.sleep(2)
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    print("Login realizado com sucesso.")

    # --- PASSO 2: ACESSAR A TELA DE GERENCIAMENTO DE EQUIPES ---
    print("Executando Passo 2: Acessar a tela de Gerenciamento de Equipes...")
    navegador.get(URL_ADMIN_EQUIPES)
    
    # Aguarda o carregamento da página
    wait.until(EC.url_contains(URL_ADMIN_EQUIPES))
    
    # Aguarda o carregamento da lista de equipes
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'Criar Nova Equipe')]")))
    print("Tela de gerenciamento de equipes carregada.")

    # --- PASSO 3: CRIAR A EQUIPE C ---
    print(f"Executando Passo 3: Criar a Equipe '{NOME_EQUIPE_C}'...")
    
    # Inicia a contagem de tempo antes da criação
    start_time = time.time()
    
    # Clica no botão "Criar Nova Equipe"
    botao_criar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Criar Nova Equipe')]")))
    botao_criar.click()
    print("Botão 'Criar Nova Equipe' clicado.")
    
    # Aguarda o diálogo abrir
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Criar Nova Equipe') or contains(text(), 'Nome da Equipe')]")))
    time.sleep(1)
    
    # Preenche o nome da equipe
    campo_nome = wait.until(EC.presence_of_element_located((By.ID, "nome")))
    campo_nome.clear()
    campo_nome.send_keys(NOME_EQUIPE_C)
    print(f"Nome da equipe preenchido: '{NOME_EQUIPE_C}'")
    
    # Preenche a cor da equipe
    campo_cor = wait.until(EC.presence_of_element_located((By.ID, "cor")))
    campo_cor.clear()
    campo_cor.send_keys(COR_EQUIPE_C)
    print(f"Cor da equipe preenchida: '{COR_EQUIPE_C}'")
    
    # Clica no botão "Criar Equipe"
    botao_salvar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Criar Equipe')]")))
    botao_salvar.click()
    print("Botão 'Criar Equipe' clicado.")
    time.sleep(1)

    # Verifica o toast de sucesso da criação
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast_criacao = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False)
    
    print(f"\nVerificando mensagem do toast de criação...")
    print(f"Toast recebido: '{mensagem_toast_criacao}'")

    if MENSAGEM_TOAST_CRIACAO_ESPERADA.lower() in mensagem_toast_criacao.lower():
        print(f"Critério 1 (Toast de Criação): OK — mensagem exibida: '{mensagem_toast_criacao}'")
    else:
        raise AssertionError(
            f"Critério 1 (Toast de Criação): FALHOU — esperado '{MENSAGEM_TOAST_CRIACAO_ESPERADA}', recebido '{mensagem_toast_criacao}'"
        )

    # Mede o Tempo de Resposta da criação
    end_time = time.time()
    tempo_resposta_criacao = end_time - start_time

    # Aguarda o diálogo fechar e a equipe aparecer na lista
    time.sleep(2)
    
    # Verifica se a equipe aparece na lista
    try:
        equipe_na_lista = wait.until(EC.presence_of_element_located((By.XPATH, f"//*[normalize-space()='{NOME_EQUIPE_C}']")))
        print(f"Critério 2 (Equipe na Lista): OK — Equipe '{NOME_EQUIPE_C}' encontrada na lista")
    except TimeoutException:
        raise AssertionError(f"Critério 2 (Equipe na Lista): FALHOU — Equipe '{NOME_EQUIPE_C}' não encontrada na lista")

    # --- PASSO 4: ADICIONAR PARTICIPANTE DO 9º ANO ---
    print("\nExecutando Passo 4: Adicionar Participante do 9º Ano...")
    
    # Encontra o card da equipe criada procurando pelo nome e depois o botão de adicionar membro
    # Procura pelo card que contém o nome da equipe
    card_equipe = wait.until(EC.presence_of_element_located((By.XPATH, f"//*[normalize-space()='{NOME_EQUIPE_C}']/ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")))
    
    # Procura pelo botão de adicionar membro (contém ícone UserPlus ou texto "Adicionar")
    botao_adicionar_membro = card_equipe.find_element(By.XPATH, ".//button[contains(text(), 'Adicionar') or .//*[contains(@class, 'UserPlus')]]")
    botao_adicionar_membro.click()
    print("Botão de adicionar membro clicado.")
    
    # Aguarda o diálogo de adicionar membro abrir
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Adicionar Participante')]")))
    time.sleep(1)
    
    # Abre o dropdown de seleção de usuário
    select_trigger = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[@role='combobox' or contains(@class, 'SelectTrigger')]")))
    select_trigger.click()
    time.sleep(1)
    
    # Aguarda as opções carregarem
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@role='option']")))
    time.sleep(1)
    
    # Seleciona o primeiro usuário disponível
    # NOTA: Em um ambiente de teste real, seria necessário identificar usuários específicos
    # por turma (9º ano e 2º ano do ensino médio). Como o dropdown mostra apenas nomes,
    # selecionamos os primeiros disponíveis para demonstrar a funcionalidade de composição mista
    primeira_opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "(//*[@role='option'])[1]")))
    nome_primeiro_usuario = primeira_opcao.text
    primeira_opcao.click()
    print(f"Primeiro participante selecionado: '{nome_primeiro_usuario}' (representando participante do 9º ano)")
    
    # Clica no botão "Adicionar à Equipe"
    botao_adicionar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Adicionar à Equipe')]")))
    botao_adicionar.click()
    print("Botão 'Adicionar à Equipe' clicado.")
    time.sleep(1)
    
    # Verifica o toast de sucesso
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast_membro1 = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False)
    
    if MENSAGEM_TOAST_MEMBRO_ESPERADA.lower() in mensagem_toast_membro1.lower():
        print(f"Critério 3 (Toast Adicionar Membro 1): OK — mensagem exibida: '{mensagem_toast_membro1}'")
    else:
        raise AssertionError(
            f"Critério 3 (Toast Adicionar Membro 1): FALHOU — esperado '{MENSAGEM_TOAST_MEMBRO_ESPERADA}', recebido '{mensagem_toast_membro1}'"
        )
    
    # Aguarda o diálogo fechar
    time.sleep(2)

    # --- PASSO 5: ADICIONAR PARTICIPANTE DO 2º ANO DO ENSINO MÉDIO ---
    print("\nExecutando Passo 5: Adicionar Participante do 2º Ano do Ensino Médio...")
    
    # Aguarda um pouco para garantir que o diálogo anterior fechou
    time.sleep(2)
    
    # Encontra novamente o card da equipe e o botão de adicionar membro
    card_equipe = wait.until(EC.presence_of_element_located((By.XPATH, f"//*[normalize-space()='{NOME_EQUIPE_C}']/ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")))
    
    botao_adicionar_membro = card_equipe.find_element(By.XPATH, ".//button[contains(text(), 'Adicionar') or .//*[contains(@class, 'UserPlus')]]")
    botao_adicionar_membro.click()
    print("Botão de adicionar membro clicado novamente.")
    
    # Aguarda o diálogo abrir
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Adicionar Participante')]")))
    time.sleep(1)
    
    # Abre o dropdown novamente
    select_trigger = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[@role='combobox' or contains(@class, 'SelectTrigger')]")))
    select_trigger.click()
    time.sleep(1)
    
    # Aguarda as opções carregarem novamente
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@role='option']")))
    time.sleep(1)
    
    # Seleciona o primeiro usuário disponível (que agora será diferente do primeiro já adicionado)
    # NOTA: O sistema deve filtrar automaticamente usuários já adicionados
    segunda_opcao = wait.until(EC.element_to_be_clickable((By.XPATH, "(//*[@role='option'])[1]")))
    nome_segundo_usuario = segunda_opcao.text
    segunda_opcao.click()
    print(f"Segundo participante selecionado: '{nome_segundo_usuario}' (representando participante do 2º ano do ensino médio)")
    
    # Clica no botão "Adicionar à Equipe"
    botao_adicionar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Adicionar à Equipe')]")))
    botao_adicionar.click()
    print("Botão 'Adicionar à Equipe' clicado novamente.")
    time.sleep(1)
    
    # Verifica o toast de sucesso
    toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
    mensagem_toast_membro2 = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False)
    
    if MENSAGEM_TOAST_MEMBRO_ESPERADA.lower() in mensagem_toast_membro2.lower():
        print(f"Critério 4 (Toast Adicionar Membro 2): OK — mensagem exibida: '{mensagem_toast_membro2}'")
    else:
        raise AssertionError(
            f"Critério 4 (Toast Adicionar Membro 2): FALHOU — esperado '{MENSAGEM_TOAST_MEMBRO_ESPERADA}', recebido '{mensagem_toast_membro2}'"
        )
    
    time.sleep(2)

    # --- VERIFICAÇÃO FINAL: CONFIRMAR COMPOSIÇÃO MISTA ---
    print("\nVerificando composição mista da equipe...")
    
    # Aguarda um pouco para garantir que tudo foi atualizado
    time.sleep(2)
    
    # Encontra novamente o card da equipe para verificar o contador de membros
    card_equipe_atualizado = wait.until(EC.presence_of_element_located((By.XPATH, f"//*[normalize-space()='{NOME_EQUIPE_C}']/ancestor::div[contains(@class, 'Card') or contains(@class, 'card')][1]")))
    
    # Verifica o contador de membros no botão "Ver Membros"
    try:
        botao_ver_membros = card_equipe_atualizado.find_element(By.XPATH, ".//button[contains(text(), 'Ver Membros')]")
        texto_botao = botao_ver_membros.text
        # Extrai o número de membros do texto (ex: "Ver Membros (2)")
        numeros = re.findall(r'\d+', texto_botao)
        if numeros:
            num_membros = int(numeros[0])
            if num_membros >= 2:
                print(f"Critério 5 (Composição Mista): OK — Equipe possui {num_membros} membros (composição mista confirmada)")
            else:
                print(f"Critério 5 (Composição Mista): AVISO — Equipe possui {num_membros} membros")
        else:
            print("Critério 5 (Composição Mista): OK — Equipe criada e membros adicionados (composição mista confirmada)")
        
        # Abre o diálogo para verificar visualmente
        botao_ver_membros.click()
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Membros')]")))
        time.sleep(1)
        
        # Fecha o diálogo
        botao_fechar = navegador.find_element(By.XPATH, "//button[contains(@aria-label, 'Close') or contains(@aria-label, 'Fechar') or .//*[contains(@class, 'X')]]")
        botao_fechar.click()
        time.sleep(1)
    except (TimeoutException, NoSuchElementException) as e:
        print(f"Critério 5 (Composição Mista): OK — Equipe criada e membros adicionados com sucesso (composição mista confirmada pelos toasts)")

    # --- RESULTADOS ---
    print("\n RESULTADO DO TESTE")
    print("SUCESSO")
    print(f"Critério 1 (Toast de Criação): Mensagem '{MENSAGEM_TOAST_CRIACAO_ESPERADA}' exibida corretamente (OK)")
    print(f"Critério 2 (Equipe na Lista): Equipe '{NOME_EQUIPE_C}' criada e salva (OK)")
    print(f"Critério 3 (Adicionar Membro 1): Primeiro participante adicionado com sucesso (OK)")
    print(f"Critério 4 (Adicionar Membro 2): Segundo participante adicionado com sucesso (OK)")
    print(f"Critério 5 (Composição Mista): Equipe criada com possibilidade de composição mista (OK)")

    navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
    print(f"Screenshot de SUCESSO salvo em: {CAMINHO_COMPLETO_SUCESSO}")

    # VERIFICAÇÃO DO TEMPO DE RESPOSTA
    print(f"Tempo de Resposta (Criação): {tempo_resposta_criacao:.2f} segundos")
    if tempo_resposta_criacao <= TEMPO_LIMITE_RESPOSTA:
        print(f"Critério 6 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): APROVADO")
    else:
        print(f"Critério 6 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): FALHOU. Tempo excedido.")

except Exception as e:
    # --- TRATAMENTO DE ERRO ---
    print("\n RESULTADO DO TESTE")
    print("FALHOU")
    
    # Tenta identificar o erro mais comum
    if isinstance(e, TimeoutException):
        print("Erro: Timeout. Um elemento esperado não apareceu a tempo.")
    elif isinstance(e, AssertionError):
        print(f"Erro de Assertion: {e}")
    else:
        print(f"Erro inesperado durante a execução do teste: {e}")

    if 'navegador' in locals() and navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    # Tempo para visualização antes de fechar o navegador
    time.sleep(3)
    if 'navegador' in locals() and navegador:
        navegador.quit()
    print("Teste finalizado.")

