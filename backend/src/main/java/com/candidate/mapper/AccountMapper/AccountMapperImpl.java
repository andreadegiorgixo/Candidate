package com.candidate.mapper.AccountMapper;

import org.springframework.stereotype.Component;

import com.candidate.dto.AccountDTO;
import com.candidate.entity.Account;

@Component
public class AccountMapperImpl implements AccountMapper {

    // la password non viene copiata: non deve mai uscire verso il client
    @Override
    public AccountDTO toDTO(Account account) {
        if (account == null) {
            return null;
        }
        AccountDTO accountDTO = new AccountDTO();
        accountDTO.setId(account.getId());
        accountDTO.setNome(account.getNome());
        accountDTO.setCognome(account.getCognome());
        accountDTO.setEmail(account.getEmail());
        accountDTO.setLinkedin(account.getLinkedin());
        accountDTO.setDataCreazione(account.getDataCreazione());
        return accountDTO;
    }

    @Override
    public Account toEntity(AccountDTO accountDTO) {
        if (accountDTO == null) {
            return null;
        }
        Account account = new Account();
        updateEntity(accountDTO, account);
        return account;
    }

    // id, password e dataCreazione restano esclusi: li gestisce il service
    @Override
    public void updateEntity(AccountDTO accountDTO, Account account) {
        account.setNome(accountDTO.getNome());
        account.setCognome(accountDTO.getCognome());
        account.setEmail(accountDTO.getEmail());
        // vuoto = nessun link
        String linkedin = accountDTO.getLinkedin() == null ? "" : accountDTO.getLinkedin().trim();
        account.setLinkedin(linkedin.isEmpty() ? null : linkedin);
    }
}
