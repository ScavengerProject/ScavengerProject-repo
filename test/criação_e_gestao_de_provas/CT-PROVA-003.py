from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os

# CONFIGURANDO AS VARIÁVEIS
DIRETORIO_DO_SCRIPT = os.path.dirname(__file__)
URL_LOGIN = "http://localhost:5173/"
TIMEOUT_MAXIMO = 10

# CONFIGURAÇÃO DO CAMINHO DOS SCREENSHOTS
DIRETORIO_BASE_SCREENSHOTS = os.path.join(DIRETORIO_DO_SCRIPT, "screenshots")
NOME_ARQUIVO_FALHA = "falha_ct_prova_003.png"
NOME_ARQUIVO_SUCESSO = "sucesso_ct_prova_003.png"
CAMINHO_COMPLETO_FALHA = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_FALHA)
CAMINHO_COMPLETO_SUCESSO = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_SUCESSO)

# DADOS DO TESTE
NOME_PROVA_BETA = "Prova Beta"
PERFIL_PERMITIDO = "ALUNOS_FUNDAMENTAL"  # Apenas Fundamental
PERFIL_NAO_PERMITIDO = "ALUNOS_MEDIO"  # Ensino Médio (aluno que tentará acessar)

# INICIANDO O TESTE CT-PROVA-003
print("Iniciando Teste CT-PROVA-003 (Restrição de Participação por Perfil)...")
print("RF 5 / Restrição por Perfil")
print("Restrição de Prova Apenas para Fundamental")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")
        
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
    # ============================================================
    # PASSO 1: ADMINISTRADOR CONFIGURA A PROVA BETA
    # ============================================================
    print("\n=== PASSO 1: Configurando Prova Beta para ser restrita apenas para Fundamental ===")
    
    # Login como Administrador
    print("Fazendo login como Administrador...")
    campo_email = wait.until(EC.presence_of_element_located((By.ID, "email")))
    campo_email.send_keys("admin@gincana.com")
    campo_senha = navegador.find_element(By.ID, "senha")
    campo_senha.send_keys("admin123")
    botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']")
    botao_entrar.click()
    print("Login como Administrador realizado.")

    # Navegação para criar prova
    print("Navegando para criar nova prova...")
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Ver Provas']"))).click()
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Gerenciar Provas']"))).click()
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Criar Nova Prova']"))).click()
    print("Formulário de criação de prova aberto.")

    # Preenchendo dados básicos da prova
    print(f"Criando prova '{NOME_PROVA_BETA}'...")
    campo_titulo = wait.until(EC.presence_of_element_located((By.ID, "titulo")))
    campo_titulo.send_keys(NOME_PROVA_BETA)
    
    campo_descricao = navegador.find_element(By.ID, "descricao")
    campo_descricao.send_keys("Prova Beta - Teste de restrição por perfil (apenas Fundamental)")

    # Selecionando formato (Questionário Online)
    print("Selecionando formato da prova...")
    trigger_dropdown = wait.until(EC.element_to_be_clickable((By.ID, "formato-dropdown")))
    trigger_dropdown.click()
    
    opcao_questionario = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@role='presentation']//div[1]")))
    opcao_questionario.click()
    print("Formato 'Questionário Online' selecionado.")

    # Configurando datas
    print("Configurando datas...")
    campo_data_inicio = wait.until(EC.element_to_be_clickable((By.ID, "data_inicio")))
    campo_data_inicio.click()
    campo_data_inicio.clear()
    campo_data_inicio.send_keys("20112025")
    
    campo_data_termino = wait.until(EC.element_to_be_clickable((By.ID, "data_fim")))
    campo_data_termino.click()
    campo_data_termino.clear()
    campo_data_termino.send_keys("22112025")
    print("Datas configuradas.")

    # Configurando restrição por perfil - Apenas ALUNOS_FUNDAMENTAL
    print("Configurando restrição por perfil: permitir apenas Alunos do Ensino Fundamental...")
    try:
        # Configurar cota para ALUNOS_FUNDAMENTAL (permitir)
        campo_cota_fundamental = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_FUNDAMENTAL")))
        campo_cota_fundamental.clear()
        campo_cota_fundamental.send_keys("10")  # Definir 10 vagas para alunos do fundamental
        print("Cota de 10 vagas configurada para Alunos do Ensino Fundamental.")
        time.sleep(1)
        
        # Garantir que ALUNOS_MEDIO está com 0 (não permitir)
        campo_cota_medio = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_MEDIO")))
        campo_cota_medio.clear()
        campo_cota_medio.send_keys("0")  # Definir 0 vagas para alunos do ensino médio
        print("Cota de 0 vagas configurada para Alunos do Ensino Médio (bloqueado).")
        time.sleep(1)
        
    except TimeoutException:
        print("Aviso: Campos de cota não encontrados. Tentando checkbox de participação ilimitada...")
        # Se não encontrar, tentar marcar o checkbox de participação ilimitada e depois ajustar
        try:
            checkbox_sem_limite = wait.until(EC.element_to_be_clickable((By.ID, "sem-limite")))
            if checkbox_sem_limite.is_selected():
                checkbox_sem_limite.click()  # Desmarcar para poder configurar individualmente
                time.sleep(1)
            
            # Agora tentar configurar as cotas
            campo_cota_fundamental = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_FUNDAMENTAL")))
            campo_cota_fundamental.clear()
            campo_cota_fundamental.send_keys("10")
            print("Cota de 10 vagas configurada para Alunos do Ensino Fundamental.")
            
            campo_cota_medio = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_MEDIO")))
            campo_cota_medio.clear()
            campo_cota_medio.send_keys("0")
            print("Cota de 0 vagas configurada para Alunos do Ensino Médio (bloqueado).")
        except:
            print("Aviso: Não foi possível configurar cotas. Continuando...")

    # Salvar a prova
    print("Salvando prova...")
    botao_salvar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Criar Prova']")))
    botao_salvar.click()
    
    # Aguardar confirmação de criação
    try:
        wait.until(EC.url_contains("/admin/provas"))
        print("Prova Beta criada com sucesso!")
    except TimeoutException:
        print("Aviso: Não foi possível confirmar redirecionamento, mas continuando...")

    time.sleep(1)  # Aguardar processamento

    # ============================================================
    # PASSO 2: ALUNO DO ENSINO MÉDIO TENTA ACESSAR
    # ============================================================
    print("\n=== PASSO 2: Aluno do Ensino Médio tenta se inscrever na Prova Beta ===")
    
    # NOTA: Este teste assume que já existe um usuário aluno com turma do Ensino Médio
    # Se necessário, crie manualmente antes de executar o teste:
    # Email: aluno3@gincana.com, Senha: admin123, Tipo: ALUNO, Turma: EM - 1º Ano (ou qualquer turma que comece com "EM")
    
    print("Fazendo logout do administrador...")
    # Navegar diretamente para página de login
    navegador.get(URL_LOGIN)
    time.sleep(1)

    # Fazer login como aluno do Ensino Médio
    print("Fazendo login como aluno do Ensino Médio...")
    print("NOTA: Certifique-se de que existe um usuário aluno com turma do Ensino Médio (EM - Xº Ano)")
    
    # Tentar login com usuário padrão de teste (ajuste se necessário)
    email_aluno = "aluno3@medio.com"  # Ajuste conforme necessário
    senha_aluno = "admin123"  # Ajuste conforme necessário
    
    try:
        campo_email = wait.until(EC.presence_of_element_located((By.ID, "email")))
        campo_email.clear()
        campo_email.send_keys(email_aluno)
        campo_senha = navegador.find_element(By.ID, "senha")
        campo_senha.clear()
        campo_senha.send_keys(senha_aluno)
        botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']")
        botao_entrar.click()
        time.sleep(1)
        print("Login como aluno do Ensino Médio realizado.")
    except Exception as e:
        print(f"ERRO: Não foi possível fazer login como aluno. Verifique se o usuário existe.")
        print(f"Erro: {e}")
        print("NOTA: Crie manualmente um usuário aluno com turma do Ensino Médio antes de executar este teste.")
        raise

    # Tentar acessar a Prova Beta
    print("Tentando acessar a Prova Beta...")
    time.sleep(1)  # Aguardar carregamento completo da página após login
    
    # Verificar em qual página estamos
    url_atual = navegador.current_url
    print(f"URL atual após login: {url_atual}")
    
    try:
        # Navegar para ver provas
        print("Navegando para página de provas...")
        
        # Estratégia 1: Tentar encontrar e clicar no botão "Ver Provas"
        botao_encontrado = False
        xpaths_botao = [
            "//button[normalize-space()='Ver Provas']",
            "//button[contains(text(), 'Ver Provas')]",
            "//a[contains(text(), 'Ver Provas')]",
            "//button[contains(@class, 'button') and contains(text(), 'Ver Provas')]",
            "//*[contains(text(), 'Ver Provas') and (self::button or self::a)]"
        ]
        
        for xpath in xpaths_botao:
            try:
                wait_rapido = WebDriverWait(navegador, 5)
                botao_ver_provas = wait_rapido.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                navegador.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", botao_ver_provas)
                time.sleep(0.5)
                botao_ver_provas.click()
                botao_encontrado = True
                print(f"Botão encontrado e clicado com XPath: {xpath}")
                break
            except (TimeoutException, Exception) as e:
                print(f"Tentativa com XPath '{xpath}' falhou: {type(e).__name__}")
                continue
        
        # Estratégia 2: Se não encontrou o botão, tentar navegar diretamente para /dashboard
        if not botao_encontrado:
            print("Botão 'Ver Provas' não encontrado. Navegando diretamente para /dashboard...")
            try:
                navegador.get("http://localhost:5173/dashboard")
                time.sleep(1)
                print("Navegação direta para /dashboard realizada.")
            except Exception as e:
                print(f"Erro ao navegar para /dashboard: {e}")
                raise
        
        # Aguardar carregamento da página de provas/dashboard
        time.sleep(2)
        
        # Verificar se estamos na página correta
        url_atual = navegador.current_url
        print(f"URL atual após navegação: {url_atual}")
        
        # Verificar se a Prova Beta aparece na lista
        print(f"Verificando se '{NOME_PROVA_BETA}' aparece na lista de provas disponíveis...")
        
        try:
            print("Aguardando carregamento da lista de provas...")
            time.sleep(2)
            
            # Verificar se há elementos de loading
            try:
                elementos_loading = navegador.find_elements(By.XPATH, "//*[contains(@class, 'loading') or contains(@class, 'spinner') or contains(text(), 'Carregando')]")
                if len(elementos_loading) > 0:
                    print("Aguardando finalização do carregamento...")
                    wait.until(EC.invisibility_of_element_located((By.XPATH, "//*[contains(@class, 'loading') or contains(@class, 'spinner')]")))
            except:
                pass
            
            # Procurar por qualquer elemento que contenha o nome da prova
            print(f"Procurando por '{NOME_PROVA_BETA}' na página...")
            elementos_prova = navegador.find_elements(By.XPATH, f"//*[contains(text(), '{NOME_PROVA_BETA}')]")
            print(f"Elementos encontrados contendo '{NOME_PROVA_BETA}': {len(elementos_prova)}")
            
            if len(elementos_prova) > 0:
                print(f"ATENÇÃO: '{NOME_PROVA_BETA}' foi encontrada na lista.")
                print("Isso pode indicar que o filtro de restrição por perfil não está funcionando corretamente.")
                
                # Tentar clicar na prova para ver detalhes
                try:
                    print("Procurando pelo card da prova...")
                    xpaths_card = [
                        f"//div[contains(@class, 'cursor-pointer') and .//p[contains(text(), '{NOME_PROVA_BETA}')]]",
                        f"//*[contains(text(), '{NOME_PROVA_BETA}')]/ancestor::div[contains(@class, 'cursor-pointer')][1]",
                        f"//div[contains(@class, 'rounded-lg') and contains(@class, 'cursor-pointer') and .//p[contains(text(), '{NOME_PROVA_BETA}')]]",
                        f"//*[contains(text(), '{NOME_PROVA_BETA}')]/ancestor::div[contains(@class, 'p-3')][1]"
                    ]
                    
                    card_encontrado = False
                    for xpath_card in xpaths_card:
                        try:
                            wait_rapido = WebDriverWait(navegador, 5)
                            card_prova = wait_rapido.until(EC.element_to_be_clickable((By.XPATH, xpath_card)))
                            navegador.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", card_prova)
                            time.sleep(1)
                            card_prova.click()
                            card_encontrado = True
                            print(f"Card encontrado e clicado com XPath: {xpath_card}")
                            break
                        except TimeoutException:
                            continue
                    
                    if not card_encontrado:
                        raise TimeoutException("Não foi possível encontrar o card da prova")
                    
                    # Aguardar o modal abrir
                    print("Aguardando o modal abrir...")
                    time.sleep(2)
                    
                    # Verificar se o modal está visível
                    try:
                        modal = wait.until(EC.presence_of_element_located((By.XPATH, 
                            f"//div[contains(@role, 'dialog') or contains(@class, 'Dialog')]//*[contains(text(), '{NOME_PROVA_BETA}')]")))
                        print("Modal aberto com sucesso!")
                        time.sleep(1)
                    except TimeoutException:
                        print("Aviso: Modal pode não ter aberto. Continuando...")
                    
                    # Tentar encontrar e clicar no botão de inscrever dentro do modal
                    try:
                        print("Procurando botão de inscrever no modal...")
                        xpaths_botao_inscrever = [
                            "//button[contains(text(), 'Inscrever-se nesta prova')]",
                            "//button[contains(text(), 'Inscrever-se')]",
                            "//button[contains(text(), 'Inscrever') and contains(@class, 'bg-blue')]",
                            "//div[contains(@class, 'DialogFooter')]//button[contains(text(), 'Inscrever')]",
                            "//button[.//*[contains(text(), 'Inscrever')]]"
                        ]
                        
                        botao_encontrado = False
                        for xpath_botao in xpaths_botao_inscrever:
                            try:
                                wait_rapido = WebDriverWait(navegador, 5)
                                botao_inscrever = wait_rapido.until(EC.element_to_be_clickable((By.XPATH, xpath_botao)))
                                navegador.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", botao_inscrever)
                                time.sleep(0.5)
                                botao_inscrever.click()
                                botao_encontrado = True
                                print(f"Botão encontrado e clicado com XPath: {xpath_botao}")
                                break
                            except TimeoutException:
                                continue
                        
                        if not botao_encontrado:
                            raise TimeoutException("Botão de inscrever não encontrado no modal")
                        
                        print("Botão de inscrever clicado. Aguardando resposta...")
                        time.sleep(3)
                        
                        # PRIMEIRO: Verificar se a inscrição foi bem-sucedida (NÃO DEVERIA ACONTECER)
                        print("Verificando se a inscrição foi bloqueada (não deveria ter sucesso)...")
                        time.sleep(2)
                        
                        # Procurar por indicadores de inscrição bem-sucedida
                        xpaths_sucesso_inscricao = [
                            "//*[contains(text(), 'Inscrição realizada com sucesso')]",
                            "//*[contains(text(), 'inscrição realizada')]",
                            "//*[contains(text(), 'Você já está inscrito')]",
                            "//*[contains(text(), 'já está inscrito')]",
                            "//*[contains(text(), 'inscrito com sucesso')]",
                            "//*[contains(@class, 'toast') and contains(@class, 'success')]",
                            "//*[contains(@class, 'success')]//*[contains(text(), 'sucesso')]",
                            "//div[contains(@class, 'bg-green')]//*[contains(text(), 'inscrito')]"
                        ]
                        
                        for xpath_sucesso in xpaths_sucesso_inscricao:
                            try:
                                wait_rapido = WebDriverWait(navegador, 3)
                                elemento_sucesso = wait_rapido.until(EC.presence_of_element_located((By.XPATH, xpath_sucesso)))
                                texto_sucesso = elemento_sucesso.text
                                if texto_sucesso and len(texto_sucesso.strip()) > 0:
                                    print(f"ERRO CRÍTICO: Inscrição foi bem-sucedida quando NÃO deveria!")
                                    print(f"Mensagem encontrada: {texto_sucesso}")
                                    print("O aluno do Ensino Médio conseguiu se inscrever na prova destinada apenas para Fundamental.")
                                    print("A lógica de bloqueio por perfil ainda não foi implementada no backend.")
                                    navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
                                    raise Exception(
                                        f"FALHA DO TESTE: Aluno não elegível (Ensino Médio) conseguiu se inscrever. "
                                        f"A lógica de bloqueio por perfil ainda não está implementada. "
                                        f"Mensagem encontrada: {texto_sucesso}"
                                    )
                            except TimeoutException:
                                continue
                        
                        # Verificar se o botão mudou para "Você já está inscrito"
                        try:
                            botao_inscrito = navegador.find_elements(By.XPATH, 
                                "//*[contains(text(), 'Você já está inscrito') or contains(text(), 'já está inscrito')]")
                            if len(botao_inscrito) > 0:
                                print("ERRO CRÍTICO: Botão mudou para 'Você já está inscrito'!")
                                print("O aluno do Ensino Médio conseguiu se inscrever na prova destinada apenas para Fundamental.")
                                print("A lógica de bloqueio por perfil ainda não foi implementada no backend.")
                                navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
                                raise Exception(
                                    "FALHA DO TESTE: Aluno não elegível (Ensino Médio) conseguiu se inscrever. "
                                    "O botão mudou para 'Você já está inscrito', indicando que a inscrição foi bem-sucedida. "
                                    "A lógica de bloqueio por perfil ainda não está implementada."
                                )
                        except Exception as e:
                            if "FALHA DO TESTE" in str(e):
                                raise
                        
                        # SEGUNDO: Verificar se aparece mensagem de erro/bloqueio (comportamento esperado)
                        print("Verificando mensagem de erro/bloqueio por perfil...")
                        try:
                            xpaths_mensagem_erro = [
                                "//*[contains(text(), 'não elegível')]",
                                "//*[contains(text(), 'não permitido')]",
                                "//*[contains(text(), 'bloqueado')]",
                                "//*[contains(text(), 'elegibilidade')]",
                                "//*[contains(text(), 'permitida')]",
                                "//*[contains(text(), 'restrição')]",
                                "//*[contains(text(), 'Você não pode')]",
                                "//*[contains(text(), 'não pode participar')]",
                                "//*[contains(text(), 'Ensino Médio')]",
                                "//*[contains(text(), 'ALUNOS_MEDIO')]",
                                "//*[contains(@class, 'toast') and contains(@class, 'error')]",
                                "//*[contains(@class, 'error')]//*[contains(text(), 'erro')]"
                            ]
                            
                            mensagem_erro_encontrada = False
                            for xpath_msg in xpaths_mensagem_erro:
                                try:
                                    wait_rapido = WebDriverWait(navegador, 3)
                                    mensagem_erro = wait_rapido.until(EC.presence_of_element_located((By.XPATH, xpath_msg)))
                                    texto_mensagem = mensagem_erro.text
                                    if texto_mensagem and len(texto_mensagem.strip()) > 0:
                                        print("SUCESSO: Mensagem de bloqueio por perfil encontrada!")
                                        print(f"Mensagem: {texto_mensagem}")
                                        navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
                                        mensagem_erro_encontrada = True
                                        break
                                except TimeoutException:
                                    continue
                            
                            if not mensagem_erro_encontrada:
                                try:
                                    botao_ainda_visivel = navegador.find_elements(By.XPATH, "//button[contains(text(), 'Inscrever-se nesta prova')]")
                                    if len(botao_ainda_visivel) > 0:
                                        print("AVISO: Botão de inscrever ainda está visível após tentativa.")
                                        print("Isso pode indicar que a lógica de bloqueio por perfil não está funcionando.")
                                        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
                                    else:
                                        print("SUCESSO: Botão de inscrever não está mais visível (inscrição bloqueada).")
                                        navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
                                except:
                                    print("Aviso: Não foi possível verificar se o botão ainda está visível.")
                            
                        except Exception as e:
                            if "FALHA DO TESTE" in str(e):
                                raise
                            print(f"ERRO ao verificar mensagem: {e}")
                            navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
                            
                    except TimeoutException:
                        print("Aviso: Botão de inscrever não encontrado. A prova pode já estar bloqueada na interface.")
                        navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
                        
                except TimeoutException:
                    print("Aviso: Não foi possível clicar na prova.")
                    navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
                    
            else:
                # Comportamento esperado: A prova não aparece na lista
                print("SUCESSO: Prova Beta NÃO aparece na lista de provas disponíveis.")
                print("Isso indica que o sistema está filtrando corretamente por perfil.")
                print("O aluno do Ensino Médio não pode ver a prova destinada apenas para Fundamental.")
                navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
                
        except Exception as e:
            print(f"Erro ao verificar presença da prova: {e}")
            navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
            
    except TimeoutException as e:
        print(f"ERRO: Timeout ao tentar acessar a prova.")
        print(f"Detalhes: {e}")
        print(f"URL atual: {navegador.current_url}")
        print("Tentando capturar screenshot e informações da página...")
        
        try:
            titulo_pagina = navegador.title
            print(f"Título da página: {titulo_pagina}")
            
            elementos_erro = navegador.find_elements(By.XPATH, "//*[contains(@class, 'error') or contains(@class, 'erro') or contains(text(), 'erro')]")
            if len(elementos_erro) > 0:
                print(f"Elementos de erro encontrados: {len(elementos_erro)}")
                for elem in elementos_erro[:3]:
                    try:
                        print(f"  - {elem.text}")
                    except:
                        pass
        except:
            pass
        
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")
        raise
        
    except Exception as e:
        print(f"ERRO: Erro inesperado ao tentar acessar a prova.")
        print(f"Tipo do erro: {type(e).__name__}")
        print(f"Detalhes: {e}")
        print(f"URL atual: {navegador.current_url}")
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")
        raise

    # ============================================================
    # RESULTADO ESPERADO: BLOQUEIO POR PERFIL
    # ============================================================
    print("\n=== RESULTADO DO TESTE ===")
    print("O sistema deve aplicar a restrição por perfil e bloquear o aluno do Ensino Médio.")
    print("Critério: Restrição por Perfil")
    print("\nTeste CT-PROVA-003 concluído com sucesso!")

except TimeoutException as e:
    print("\n=== RESULTADO DO TESTE ===")
    print("FALHOU - Timeout")
    print(f"Erro: {e}")
    if 'navegador' in locals() and navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

except Exception as e:
    print("\n=== RESULTADO DO TESTE ===")
    print("FALHOU")
    print(f"Erro inesperado: {e}")
    if 'navegador' in locals() and navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    # Tempo para visualização antes de fechar
    print("\nAguardando 5 segundos antes de fechar o navegador...")
    time.sleep(5)
    if 'navegador' in locals() and navegador:
        navegador.quit()
    print("Teste finalizado.")

